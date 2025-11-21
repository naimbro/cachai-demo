# Demo Parlamentario Chile

Demo interactivo de inteligencia artificial aplicada al analisis parlamentario chileno. Incluye Digital Twin conversacional, prediccion de votos y busqueda semantica de proyectos de ley.

## Caracteristicas

- **Digital Twin**: Conversa con el gemelo digital de un parlamentario basado en su historial de votaciones
- **Prediccion de Votos**: Predice como votarian los parlamentarios ante un nuevo proyecto de ley
- **Explorer**: Busqueda semantica de proyectos de ley por similitud

## Tecnologias

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Firebase Cloud Functions v2 (Node.js 20)
- **IA**: OpenAI GPT-4o-mini (chat) + HuggingFace sentence-transformers (embeddings)
- **Datos**: 157 parlamentarios activos, 2535 proyectos de ley con embeddings reales
- **Hosting**: GitHub Pages (frontend) + Firebase (backend)

---

## Instalacion

### Requisitos Previos

- Node.js 18+
- npm o yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Cuenta de Firebase (gratuita)
- API Key de OpenAI (opcional, hay fallback)

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/diputados_chatbot.git
cd diputados_chatbot/demo_github
```

### 2. Configurar el Frontend

```bash
cd frontend
npm install
```

#### Variables de Entorno (Frontend)

Crear archivo `.env` en `frontend/`:

```env
VITE_API_URL=https://us-central1-TU_PROYECTO.cloudfunctions.net
```

### 3. Configurar el Backend

```bash
cd ../backend/functions
npm install
```

#### Configurar Firebase

```bash
# Login a Firebase
firebase login

# Inicializar proyecto (seleccionar Functions)
firebase init functions
```

#### Variables de Entorno (Backend)

Crear archivo `.env` en `backend/functions/`:

```env
# OpenAI API Key (requerido para Digital Twin chat)
OPENAI_API_KEY=sk-your-key-here

# HuggingFace API Key (requerido para embeddings de busqueda semantica)
HF_API_KEY=hf_your-key-here
```

Para produccion, configura las variables via Firebase secrets:

```bash
# Configurar secretos para Firebase Functions v2
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set HF_API_KEY
```

---

## Desarrollo Local

### Frontend

```bash
cd frontend
npm run dev
```

El frontend estara disponible en `http://localhost:5173`

### Backend (Emulador)

```bash
cd backend/functions
npm run serve
```

Las funciones estaran en `http://localhost:5001`

---

## Despliegue

### Frontend a GitHub Pages

1. Actualizar `vite.config.js` con tu base path:

```javascript
export default defineConfig({
  base: '/tu-repositorio/',
  // ...
})
```

2. Actualizar `main.jsx` con el mismo basename:

```javascript
<BrowserRouter basename="/tu-repositorio">
```

3. Desplegar:

```bash
cd frontend
npm run build
npm run deploy
```

### Backend a Firebase

```bash
cd backend/functions
firebase deploy --only functions
```

---

## Configuracion de Variables de Entorno

### Firebase Functions v2

```bash
# Configurar secretos para produccion
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set HF_API_KEY

# Desplegar con los secretos
firebase deploy --only functions
```

### Variables Disponibles

| Variable | Descripcion | Requerido |
|----------|-------------|-----------|
| `OPENAI_API_KEY` | API Key de OpenAI para Digital Twin chat | Opcional* |
| `HF_API_KEY` | API Key de HuggingFace para embeddings semanticos | Opcional* |

*Sin API keys, el sistema usa respuestas de fallback y embeddings deterministicos basados en hash

---

## Estructura del Proyecto

```
demo_github/
├── frontend/                 # Aplicacion React
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/           # Paginas principales
│   │   ├── services/        # API client
│   │   └── assets/          # Estilos CSS
│   ├── public/              # Archivos estaticos
│   └── package.json
│
├── backend/
│   └── functions/           # Firebase Cloud Functions
│       ├── index.js         # Endpoints API
│       ├── .env.example     # Variables de entorno ejemplo
│       └── parliamentdata/  # Datos reales exportados
│           ├── diputados.json    # 157 parlamentarios activos
│           ├── bills.json        # 2535 proyectos de ley
│           ├── embeddings.json   # Embeddings sentence-transformers
│           └── metadata.json     # Estadisticas y materias
│
├── scripts/
│   └── export_data.py       # Script para exportar datos de SQLite
│
└── README.md
```

---

## API Endpoints

### GET /getParlamentarios

Obtiene lista de parlamentarios activos.

**Request:**
```
GET /getParlamentarios?search=garcia
```

**Response:**
```json
{
  "parlamentarios": [
    { "id": 1234, "nombre": "Maria Garcia", "partido": "PDC", "foto": "https://..." }
  ],
  "total": 1
}
```

### GET /getParlamentario

Obtiene detalles de un parlamentario.

**Request:**
```
GET /getParlamentario?id=1234
```

**Response:**
```json
{
  "parlamentario": {
    "id": 1234,
    "nombre": "Maria Garcia",
    "partido": "PDC",
    "profesion": "Abogada",
    "estadisticas_voto": { "a_favor": 120, "en_contra": 45, "abstencion": 10, "total": 175 },
    "votaciones_recientes": [...]
  }
}
```

### POST /digitalTwinQuery

Conversa con el gemelo digital de un parlamentario.

**Request:**
```json
{
  "parlamentarioId": 1,
  "pregunta": "Cual es tu posicion sobre la reforma de pensiones?"
}
```

**Response:**
```json
{
  "respuesta": "Como Maria Garcia del PDC...",
  "referencias": [
    { "titulo": "Reforma de pensiones", "relevancia": 0.85 }
  ]
}
```

### POST /predictVote

Predice votos para un proyecto de ley.

**Request:**
```json
{
  "textoProyecto": "Proyecto que establece normas sobre proteccion de datos..."
}
```

**Response:**
```json
{
  "predicciones": [
    {
      "parlamentario": { "id": 1, "nombre": "Maria Garcia", "partido": "PDC" },
      "probabilidadAFavor": 0.72,
      "probabilidadEnContra": 0.18,
      "probabilidadAbstencion": 0.10
    }
  ],
  "resumen": "Analisis basado en proyectos similares...",
  "proyectosSimilares": [...]
}
```

### POST /searchBills

Busqueda semantica de proyectos.

**Request:**
```json
{
  "query": "proteccion datos personales"
}
```

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "titulo": "Proyecto sobre proteccion de datos",
      "similitud": 0.92
    }
  ]
}
```

### GET /healthCheck

Verifica el estado del sistema.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "dataLoaded": { "diputados": 157, "bills": 2535, "embeddings": 2535 },
  "config": { "openai": true, "huggingface": true }
}
```

---

## Actualizar Datos desde SQLite

Para actualizar los datos desde la base de datos SQLite principal:

1. Ejecutar el script de exportacion:

```bash
cd scripts
python export_data.py
```

2. El script exporta:
   - `diputados.json`: Parlamentarios activos (con votos en 2024+)
   - `bills.json`: Proyectos de ley con materias
   - `embeddings.json`: Embeddings sentence-transformers
   - `metadata.json`: Estadisticas agregadas

3. Re-desplegar funciones:

```bash
cd backend
firebase deploy --only functions
```

### Requisitos del Script

- Python 3.8+
- Base de datos `parlamento.db` en la raiz del proyecto padre
- Estructura esperada: tablas `dim_parlamentario`, `bills`, `votos_parlamentario`, `bill_embeddings`, etc.

---

## Costos Estimados

### Firebase (Plan Gratuito - Spark)
- Cloud Functions: 2M invocaciones/mes
- Hosting: 10GB almacenamiento, 360MB/dia transferencia

### OpenAI (con uso tipico demo)
- GPT-4o-mini: ~$0.15/1M tokens input, ~$0.60/1M tokens output
- Embeddings: ~$0.02/1M tokens
- Estimado demo: < $5/mes con uso moderado

---

## Troubleshooting

### CORS Errors

Verificar que el frontend use la URL correcta de Firebase Functions:

```javascript
// frontend/.env
VITE_API_URL=https://us-central1-TU_PROYECTO.cloudfunctions.net
```

### Firebase Deploy Fails

```bash
# Verificar login
firebase login

# Verificar proyecto
firebase projects:list

# Seleccionar proyecto correcto
firebase use TU_PROYECTO
```

### OpenAI API Errors

El sistema tiene fallback automatico. Si no hay API key o hay errores:
- Digital Twin usa respuestas template
- Predictor usa heuristicas basadas en votaciones similares
- Embeddings usa hash deterministico del texto

---

## Licencia

MIT License - Ver archivo LICENSE para detalles.

---

## Contribuir

1. Fork el repositorio
2. Crear branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

---

## Contacto

Para preguntas o sugerencias, abrir un Issue en GitHub.
