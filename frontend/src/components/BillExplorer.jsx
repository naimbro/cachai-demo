import { useState } from 'react'
import { searchBills } from '../services/api'

function BillExplorer() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    setHasSearched(true)
    setError(null)

    try {
      const data = await searchBills(searchQuery)
      setResults(data.results || [])
    } catch (err) {
      console.error('Search error:', err)
      setError('Error al buscar proyectos. Intenta de nuevo.')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const getEstadoBadge = (estado) => {
    const badges = {
      'Aprobado': 'badge-success',
      'En tramitacion': 'badge-warning',
      'Primer tramite': 'badge-primary',
      'Segundo tramite': 'badge-primary',
      'En comision': 'badge-warning',
      'Rechazado': 'badge-danger'
    }
    return badges[estado] || 'badge-neutral'
  }

  return (
    <div className="space-y-6">
      {/* Search Box */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center">
          <svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Busqueda Semantica de Proyectos
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          Busca proyectos de ley por tema, contenido o palabras clave.
          El sistema encontrara proyectos semanticamente similares.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ej: proteccion de datos, pension, energia renovable..."
              className="input-field w-full pr-10"
            />
            <svg className="w-5 h-5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
            className="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Buscar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-6 border-red-500/30 bg-red-500/10 text-red-300">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && !error && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">
              {results.length} proyecto{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </h3>
            {results.length > 0 && (
              <span className="text-sm text-slate-500 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Ordenados por relevancia
              </span>
            )}
          </div>

          {results.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-700 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-400">No se encontraron proyectos que coincidan con tu busqueda.</p>
              <p className="text-slate-500 text-sm mt-2">Intenta con otros terminos</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {results.map((bill) => (
                <div key={bill.id} className="glass-card-hover p-6 group">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-grow min-w-0">
                      <h4 className="font-semibold text-slate-100 mb-2 group-hover:text-primary-300 transition-colors">
                        {bill.titulo}
                      </h4>
                      <p className="text-slate-400 text-sm mb-4 leading-relaxed">{bill.resumen}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={getEstadoBadge(bill.estado)}>
                          {bill.estado}
                        </span>
                        {(bill.materias || []).map((materia, idx) => (
                          <span key={idx} className="badge-neutral">
                            {materia}
                          </span>
                        ))}
                        <span className="text-xs text-slate-500 ml-2 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {bill.fecha}
                        </span>
                      </div>
                    </div>
                    {bill.similitud && (
                      <div className="text-right flex-shrink-0">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/30 flex flex-col items-center justify-center">
                          <span className="text-xl font-bold text-gradient">
                            {Math.round(bill.similitud * 100)}%
                          </span>
                          <span className="text-xs text-slate-500">match</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial state */}
      {!hasSearched && (
        <div className="glass-card p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-dark-700 flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-lg text-slate-300 mb-2">Ingresa un termino de busqueda</p>
          <p className="text-sm text-slate-500">El sistema buscara proyectos semanticamente relacionados</p>
        </div>
      )}
    </div>
  )
}

export default BillExplorer
