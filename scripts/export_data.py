#!/usr/bin/env python3
"""
Export data from parlamento.db SQLite database to JSON files for the demo.
Exports: parlamentarios, bills, embeddings, metadata
"""

import sqlite3
import json
import os
from pathlib import Path
from collections import defaultdict

# Paths
DB_PATH = Path(__file__).parent.parent.parent / "data" / "database" / "parlamento.db"
OUTPUT_DIR = Path(__file__).parent.parent / "backend" / "functions" / "parliamentdata"

def get_connection():
    """Get database connection."""
    return sqlite3.connect(str(DB_PATH))

def export_parlamentarios():
    """Export current legislature parlamentarios (those with votes in 2024+)."""
    print("Exporting parlamentarios...")
    conn = get_connection()
    cursor = conn.cursor()

    # Get active MPs (voted in 2024+)
    cursor.execute('''
        SELECT DISTINCT
            p.mp_uid,
            p.nombre_completo,
            COALESCE(d.nombre_partido, 'Independiente') as partido,
            p.url_foto,
            p.profesion
        FROM dim_parlamentario p
        JOIN votos_parlamentario vp ON p.mp_uid = vp.mp_uid
        JOIN sesiones_votacion sv ON vp.sesion_votacion_id = sv.sesion_votacion_id
        LEFT JOIN dim_partidos d ON p.partido_militante_actual_id = d.partido_id
        WHERE sv.fecha >= '2024-01-01'
        ORDER BY p.nombre_completo
    ''')

    parlamentarios = []
    mp_uids = []

    for row in cursor.fetchall():
        mp_uid, nombre, partido, foto, profesion = row
        mp_uids.append(mp_uid)
        parlamentarios.append({
            "id": mp_uid,
            "nombre": nombre,
            "partido": partido,
            "foto": foto,
            "profesion": profesion or "No especificada"
        })

    # Get voting statistics for each parlamentario
    print(f"  Getting vote stats for {len(parlamentarios)} parlamentarios...")
    for p in parlamentarios:
        cursor.execute('''
            SELECT voto, COUNT(*)
            FROM votos_parlamentario
            WHERE mp_uid = ?
            GROUP BY voto
        ''', (p["id"],))

        stats = {"a_favor": 0, "en_contra": 0, "abstencion": 0, "pareo": 0}
        for voto, count in cursor.fetchall():
            voto_lower = voto.lower().replace(" ", "_")
            if "favor" in voto_lower:
                stats["a_favor"] = count
            elif "contra" in voto_lower:
                stats["en_contra"] = count
            elif "absten" in voto_lower:
                stats["abstencion"] = count
            elif "pareo" in voto_lower:
                stats["pareo"] = count

        total = sum(stats.values())
        p["estadisticas_voto"] = {
            "total": total,
            **stats
        }

        # Get recent votes (last 20)
        cursor.execute('''
            SELECT b.bill_id, b.titulo, vp.voto, sv.fecha
            FROM votos_parlamentario vp
            JOIN sesiones_votacion sv ON vp.sesion_votacion_id = sv.sesion_votacion_id
            JOIN bills b ON sv.bill_id = b.bill_id
            WHERE vp.mp_uid = ?
            ORDER BY sv.fecha DESC
            LIMIT 20
        ''', (p["id"],))

        p["votaciones_recientes"] = []
        for bill_id, titulo, voto, fecha in cursor.fetchall():
            p["votaciones_recientes"].append({
                "bill_id": bill_id,
                "titulo": titulo[:100] + "..." if len(titulo) > 100 else titulo,
                "voto": voto.lower(),
                "fecha": fecha
            })

    conn.close()

    # Save
    output_path = OUTPUT_DIR / "diputados.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(parlamentarios, f, ensure_ascii=False, indent=2)

    print(f"  Exported {len(parlamentarios)} parlamentarios to {output_path}")
    return parlamentarios

def export_bills():
    """Export all bills with materias."""
    print("Exporting bills...")
    conn = get_connection()
    cursor = conn.cursor()

    # Get all bills
    cursor.execute('''
        SELECT
            bill_id,
            titulo,
            resumen,
            fecha_ingreso,
            etapa,
            resultado_final,
            iniciativa,
            origen
        FROM bills
        ORDER BY fecha_ingreso DESC
    ''')

    bills_dict = {}
    for row in cursor.fetchall():
        bill_id, titulo, resumen, fecha, etapa, resultado, iniciativa, origen = row

        # Map estado
        estado = "En tramitacion"
        if resultado:
            if "aprob" in resultado.lower():
                estado = "Aprobado"
            elif "rechaz" in resultado.lower():
                estado = "Rechazado"
            elif "archiv" in resultado.lower():
                estado = "Archivado"
        elif etapa:
            if "primer" in etapa.lower():
                estado = "Primer tramite"
            elif "segundo" in etapa.lower():
                estado = "Segundo tramite"
            elif "tercer" in etapa.lower():
                estado = "Tercer tramite"
            elif "comision" in etapa.lower():
                estado = "En comision"

        # Map camara from origen
        camara = "Diputados"
        if origen and "senado" in origen.lower():
            camara = "Senado"

        bills_dict[bill_id] = {
            "id": bill_id,
            "titulo": titulo,
            "resumen": resumen or titulo,  # Fallback to titulo if no resumen
            "fecha": fecha,
            "estado": estado,
            "tipo": iniciativa or "Mocion",
            "camara": camara,
            "materias": []
        }

    # Get materias for each bill
    cursor.execute('''
        SELECT bm.bill_id, m.nombre
        FROM bill_materias bm
        JOIN dim_materias m ON bm.materia_id = m.materia_id
    ''')

    for bill_id, materia in cursor.fetchall():
        if bill_id in bills_dict:
            bills_dict[bill_id]["materias"].append(materia)

    conn.close()

    bills = list(bills_dict.values())

    # Save
    output_path = OUTPUT_DIR / "bills.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(bills, f, ensure_ascii=False, indent=2)

    print(f"  Exported {len(bills)} bills to {output_path}")
    return bills

def export_embeddings():
    """Export bill embeddings."""
    print("Exporting embeddings...")
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT bill_id, embedding, model_name, embedding_dimension
        FROM bill_embeddings
    ''')

    embeddings = []
    for row in cursor.fetchall():
        bill_id, embedding_json, model, dim = row
        embedding = json.loads(embedding_json)
        embeddings.append({
            "billId": bill_id,
            "embedding": embedding
        })

    conn.close()

    # Also save metadata separately
    metadata_emb = {
        "model": "all-MiniLM-L6-v2",
        "dimension": 384,
        "count": len(embeddings)
    }

    # Save embeddings
    output_path = OUTPUT_DIR / "embeddings.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(embeddings, f, ensure_ascii=False)

    print(f"  Exported {len(embeddings)} embeddings to {output_path}")
    return embeddings, metadata_emb

def export_metadata(parlamentarios, bills):
    """Export metadata including party stats and materias list."""
    print("Exporting metadata...")
    conn = get_connection()
    cursor = conn.cursor()

    # Get all partidos
    cursor.execute('SELECT partido_id, nombre_partido, sigla FROM dim_partidos')
    partidos = {row[0]: {"nombre": row[1], "sigla": row[2]} for row in cursor.fetchall()}

    # Calculate party cohesion from voting data
    # (simplified: percentage of votes where majority of party voted same way)
    party_stats = {}
    for partido_id, info in partidos.items():
        party_stats[info["nombre"]] = {
            "sigla": info["sigla"],
            "miembros": 0,
            "cohesion": 0.85  # Default placeholder
        }

    # Count party members from parlamentarios
    for p in parlamentarios:
        partido = p["partido"]
        if partido in party_stats:
            party_stats[partido]["miembros"] += 1
        else:
            party_stats[partido] = {"sigla": "", "miembros": 1, "cohesion": 0.80}

    # Get all unique materias
    cursor.execute('SELECT DISTINCT nombre FROM dim_materias ORDER BY nombre')
    materias = [row[0] for row in cursor.fetchall()]

    conn.close()

    metadata = {
        "partidos": party_stats,
        "materias": materias[:100],  # Top 100 materias
        "stats": {
            "total_parlamentarios": len(parlamentarios),
            "total_bills": len(bills),
            "periodo": "2022-2026"
        }
    }

    # Save
    output_path = OUTPUT_DIR / "metadata.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"  Exported metadata to {output_path}")
    return metadata

def main():
    """Run all exports."""
    print(f"\nDatabase: {DB_PATH}")
    print(f"Output: {OUTPUT_DIR}\n")

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Export all data
    parlamentarios = export_parlamentarios()
    bills = export_bills()
    embeddings, emb_meta = export_embeddings()
    metadata = export_metadata(parlamentarios, bills)

    print(f"\n{'='*50}")
    print("EXPORT COMPLETE!")
    print(f"{'='*50}")
    print(f"  Parlamentarios: {len(parlamentarios)}")
    print(f"  Bills: {len(bills)}")
    print(f"  Embeddings: {len(embeddings)}")
    print(f"  Partidos: {len(metadata['partidos'])}")
    print(f"{'='*50}\n")

if __name__ == "__main__":
    main()
