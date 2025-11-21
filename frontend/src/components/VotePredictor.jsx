import { useState } from 'react'
import { predictVote } from '../services/api'

function VotePredictor() {
  const [textoProyecto, setTextoProyecto] = useState('')
  const [predicciones, setPredicciones] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handlePredict = async () => {
    if (!textoProyecto.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await predictVote(textoProyecto)
      setPredicciones(data)
    } catch (err) {
      console.error('Error:', err)
      setError('Error al procesar la prediccion. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const getVoteBadge = (prob) => {
    if (prob >= 0.7) return 'badge-success'
    if (prob >= 0.5) return 'badge-warning'
    return 'badge-danger'
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Texto del Proyecto de Ley
        </h3>
        <textarea
          value={textoProyecto}
          onChange={(e) => setTextoProyecto(e.target.value)}
          placeholder="Pega aqui el texto o resumen del proyecto de ley que deseas analizar..."
          className="input-field h-40 resize-none"
        />
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-slate-500">
            {textoProyecto.length} caracteres
          </span>
          <button
            onClick={handlePredict}
            disabled={isLoading || !textoProyecto.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Analizando...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Predecir Votos</span>
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

      {/* Results Section */}
      {predicciones && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary */}
          <div className="glass-card p-6 bg-gradient-to-br from-primary-500/10 to-transparent border-primary-500/20">
            <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Resumen del Analisis
            </h3>
            <p className="text-slate-300 leading-relaxed">{predicciones.resumen}</p>
          </div>

          {/* Similar Projects */}
          {predicciones.proyectosSimilares && predicciones.proyectosSimilares.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Proyectos Similares Encontrados
              </h3>
              <div className="space-y-2">
                {predicciones.proyectosSimilares.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-dark-800/50 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <span className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center text-slate-400 font-medium text-sm flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-slate-300 truncate">{p.titulo}</span>
                    </div>
                    <span className="badge-primary flex-shrink-0 ml-2">
                      {Math.round(p.similitud * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predictions Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Predicciones por Parlamentario
                <span className="ml-2 text-sm text-slate-500 font-normal">
                  ({predicciones.predicciones?.length || 0} parlamentarios)
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Parlamentario
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Partido
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                      A Favor
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                      En Contra
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Abstencion
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {predicciones.predicciones?.map((pred, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-dark-600 rounded-lg flex items-center justify-center text-slate-300 font-medium">
                            {pred.parlamentario.nombre.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-200">{pred.parlamentario.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-sm">
                        {pred.parlamentario.partido}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={getVoteBadge(pred.probabilidadAFavor)}>
                          {Math.round(pred.probabilidadAFavor * 100)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={getVoteBadge(1 - pred.probabilidadEnContra)}>
                          {Math.round(pred.probabilidadEnContra * 100)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="badge-neutral">
                          {Math.round(pred.probabilidadAbstencion * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VotePredictor
