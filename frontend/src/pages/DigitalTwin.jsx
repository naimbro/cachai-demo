import { useState, useEffect } from 'react'
import DigitalTwinChat from '../components/DigitalTwinChat'
import { getParlamentarios, getParlamentario } from '../services/api'

function DigitalTwin() {
  const [parlamentarios, setParlamentarios] = useState([])
  const [selectedParlamentario, setSelectedParlamentario] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  // Fetch parlamentarios on mount
  useEffect(() => {
    async function fetchParlamentarios() {
      try {
        setLoading(true)
        const data = await getParlamentarios()
        setParlamentarios(data.parlamentarios)
      } catch (err) {
        setError('Error cargando parlamentarios')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchParlamentarios()
  }, [])

  // Filter parlamentarios by search
  const filteredParlamentarios = parlamentarios.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.partido.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Fetch full details when selecting a parlamentario
  const handleSelectParlamentario = async (p) => {
    try {
      const data = await getParlamentario(p.id)
      setSelectedParlamentario(data.parlamentario)
    } catch (err) {
      // Fallback to basic info if detailed fetch fails
      setSelectedParlamentario(p)
    }
    // Open mobile chat modal
    setMobileChatOpen(true)
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
            <span className="w-2 h-2 bg-primary-400 rounded-full mr-2 animate-pulse" />
            <span className="text-sm text-primary-300">Conversacion con IA</span>
          </div>
          <h1 className="text-display text-slate-100 mb-4">Digital Twin</h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Conversa con el gemelo digital de un parlamentario chileno.
            La IA responde basandose en su historial de votaciones y posiciones politicas.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Selector Panel */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Seleccionar Parlamentario
              </h2>

              {/* Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre o partido..."
                  className="input-field w-full pl-10"
                />
                <svg className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Loading state */}
              {loading && (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-slate-500 text-sm">Cargando parlamentarios...</p>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="text-center py-8 text-red-400">
                  <p>{error}</p>
                </div>
              )}

              {/* Parlamentarios list */}
              {!loading && !error && (
                <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
                  <p className="text-xs text-slate-500 mb-2">{filteredParlamentarios.length} parlamentarios</p>
                  {filteredParlamentarios.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectParlamentario(p)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-300
                        ${selectedParlamentario?.id === p.id
                          ? 'border-primary-500/50 bg-primary-500/10 shadow-lg shadow-primary-500/10'
                          : 'border-white/5 bg-dark-800/30 hover:border-white/10 hover:bg-dark-700/50'
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        {p.foto ? (
                          <img
                            src={p.foto}
                            alt={p.nombre}
                            className="w-10 h-10 rounded-xl object-cover"
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nombre)}&background=3b82f6&color=fff`
                            }}
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold
                            ${selectedParlamentario?.id === p.id
                              ? 'bg-gradient-to-br from-primary-500 to-accent-500'
                              : 'bg-dark-600'}`}>
                            {p.nombre.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate text-sm ${selectedParlamentario?.id === p.id ? 'text-slate-100' : 'text-slate-300'}`}>
                            {p.nombre}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{p.partido}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Panel - Desktop only */}
          <div className="hidden lg:block lg:col-span-2">
            <DigitalTwinChat parlamentario={selectedParlamentario} />

            {/* Info Panel */}
            {selectedParlamentario && (
              <div className="mt-6 glass-card p-6 animate-fade-in">
                <h3 className="font-semibold text-slate-100 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Informacion del Parlamentario
                </h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-sm text-slate-500">Partido</span>
                    <p className="font-medium text-slate-200">{selectedParlamentario.partido}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-slate-500">Profesion</span>
                    <p className="font-medium text-slate-200">{selectedParlamentario.profesion || 'No especificada'}</p>
                  </div>
                  {selectedParlamentario.estadisticas_voto && (
                    <div className="sm:col-span-2 space-y-2">
                      <span className="text-sm text-slate-500">Estadisticas de Votacion</span>
                      <div className="flex flex-wrap gap-2">
                        <span className="badge-success">
                          A favor: {selectedParlamentario.estadisticas_voto.a_favor}
                        </span>
                        <span className="badge-danger">
                          En contra: {selectedParlamentario.estadisticas_voto.en_contra}
                        </span>
                        <span className="badge-warning">
                          Abstencion: {selectedParlamentario.estadisticas_voto.abstencion}
                        </span>
                        <span className="badge-neutral">
                          Total: {selectedParlamentario.estadisticas_voto.total}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Chat Modal - Full screen overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-50 bg-dark-900 transform transition-transform duration-300 ease-out ${
          mobileChatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <DigitalTwinChat
          parlamentario={selectedParlamentario}
          onClose={() => setMobileChatOpen(false)}
          isMobile={true}
        />
      </div>
    </div>
  )
}

export default DigitalTwin
