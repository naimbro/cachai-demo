import { useState, useRef, useCallback, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { queryNetwork, getNetworkStats, getTopPoliticians } from '../services/api'

function NetworkExplorer() {
  const [query, setQuery] = useState('')
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cypherQuery, setCypherQuery] = useState('')
  const [narrative, setNarrative] = useState(null)
  const [stats, setStats] = useState(null)
  const [topPoliticians, setTopPoliticians] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const graphRef = useRef()
  const containerRef = useRef()
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })

  // Load initial stats
  useEffect(() => {
    loadStats()
  }, [])

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: Math.max(400, window.innerHeight - 400)
        })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const loadStats = async () => {
    try {
      const [statsData, topData] = await Promise.all([
        getNetworkStats().catch(() => null),
        getTopPoliticians(10).catch(() => ({ politicians: [] }))
      ])
      if (statsData) setStats(statsData)
      if (topData?.politicians) setTopPoliticians(topData.politicians)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setSelectedNode(null)
    setNarrative(null)

    try {
      const result = await queryNetwork(query)
      setGraphData(result.graph)
      setCypherQuery(result.cypher)
      setNarrative(result.narrative)

      // Center the graph
      if (graphRef.current) {
        setTimeout(() => {
          graphRef.current.zoomToFit(400, 50)
        }, 100)
      }
    } catch (err) {
      setError(err.message || 'Error al consultar la red')
      setGraphData({ nodes: [], links: [] })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickQuery = (queryText) => {
    setQuery(queryText)
    // Auto-submit
    setIsLoading(true)
    setError(null)
    setSelectedNode(null)
    setNarrative(null)

    queryNetwork(queryText)
      .then(result => {
        setGraphData(result.graph)
        setCypherQuery(result.cypher)
        setNarrative(result.narrative)
        if (graphRef.current) {
          setTimeout(() => graphRef.current.zoomToFit(400, 50), 100)
        }
      })
      .catch(err => {
        setError(err.message || 'Error al consultar la red')
        setGraphData({ nodes: [], links: [] })
      })
      .finally(() => setIsLoading(false))
  }

  const nodeColor = useCallback((node) => {
    if (node.coalition === 'Izquierda') return '#ef4444' // red
    if (node.coalition === 'Derecha') return '#3b82f6' // blue
    return '#a855f7' // purple for Centro
  }, [])

  const linkColor = useCallback((link) => {
    if (link.sign === 'positive') return 'rgba(34, 197, 94, 0.6)' // green
    if (link.sign === 'negative') return 'rgba(239, 68, 68, 0.6)' // red
    return 'rgba(148, 163, 184, 0.4)' // gray for neutral
  }, [])

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node)
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 500)
      graphRef.current.zoom(2, 500)
    }
  }, [])

  const quickQueries = [
    { label: 'Red de Boric', query: 'red de Gabriel Boric' },
    { label: 'Aliados de Kast', query: 'aliados de Jose Antonio Kast' },
    { label: 'Conflictos izquierda-derecha', query: 'conflictos entre izquierda y derecha' },
    { label: 'Politicos mas conectados', query: 'los 20 politicos mas mencionados' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          <span className="text-gradient">Network Explorer</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Explora la red de interacciones entre politicos chilenos extraida de medios de comunicacion.
          Usa lenguaje natural para consultar la red.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-primary-400">{stats.politicians?.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Politicos</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-accent-400">{stats.interactions?.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Interacciones</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.bySign?.positive?.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Positivas</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.bySign?.negative?.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Negativas</div>
          </div>
        </div>
      )}

      {/* Search Form */}
      <div className="glass-card p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: red de Boric, aliados de Kast, conflictos entre izquierda y derecha..."
              className="input-field flex-grow"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="btn-primary px-6 whitespace-nowrap"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Buscando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Explorar
                </span>
              )}
            </button>
          </div>

          {/* Quick Queries */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-slate-500">Consultas rapidas:</span>
            {quickQueries.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQuickQuery(q.query)}
                className="px-3 py-1 text-sm rounded-full bg-dark-700 text-slate-300 hover:bg-dark-600 hover:text-white transition-colors"
                disabled={isLoading}
              >
                {q.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Narrative */}
      {narrative && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Analisis
          </h3>
          <div className="text-slate-300 leading-relaxed whitespace-pre-line">
            {narrative}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
          <p className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        </div>
      )}

      {/* Graph Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Graph */}
        <div className="lg:col-span-3 glass-card p-4" ref={containerRef}>
          {graphData.nodes.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-400">
                  {graphData.nodes.length} nodos, {graphData.links.length} conexiones
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500" /> Izquierda
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500" /> Derecha
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-purple-500" /> Centro
                  </span>
                </div>
              </div>
              <div className="bg-dark-800 rounded-xl overflow-hidden" style={{ height: dimensions.height }}>
                <ForceGraph2D
                  ref={graphRef}
                  graphData={graphData}
                  width={dimensions.width - 32}
                  height={dimensions.height}
                  nodeColor={nodeColor}
                  nodeLabel="name"
                  nodeRelSize={6}
                  linkColor={linkColor}
                  linkWidth={1.5}
                  linkDirectionalArrowLength={3}
                  linkDirectionalArrowRelPos={1}
                  onNodeClick={handleNodeClick}
                  cooldownTicks={100}
                  backgroundColor="transparent"
                  nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.name
                    const fontSize = 12 / globalScale
                    ctx.font = `${fontSize}px Sans-Serif`

                    // Node circle
                    ctx.beginPath()
                    ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false)
                    ctx.fillStyle = nodeColor(node)
                    ctx.fill()

                    // Label (only show if zoomed in enough)
                    if (globalScale > 0.8) {
                      ctx.textAlign = 'center'
                      ctx.textBaseline = 'middle'
                      ctx.fillStyle = 'rgba(255,255,255,0.9)'
                      ctx.fillText(label, node.x, node.y + 10)
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="text-lg">Realiza una consulta para visualizar la red</p>
              <p className="text-sm mt-2">Usa las consultas rapidas o escribe tu propia pregunta</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected Node Info */}
          {selectedNode && (
            <div className="glass-card p-4">
              <h3 className="font-semibold text-white mb-2">Politico seleccionado</h3>
              <div className="space-y-2">
                <p className="text-lg text-primary-400">{selectedNode.name}</p>
                <p className="text-sm text-slate-400">
                  Coalicion: <span className={
                    selectedNode.coalition === 'Izquierda' ? 'text-red-400' :
                    selectedNode.coalition === 'Derecha' ? 'text-blue-400' : 'text-purple-400'
                  }>{selectedNode.coalition}</span>
                </p>
                <button
                  onClick={() => handleQuickQuery(`red de ${selectedNode.name}`)}
                  className="w-full btn-secondary text-sm mt-2"
                >
                  Ver red de {selectedNode.name.split(' ')[0]}
                </button>
              </div>
            </div>
          )}

          {/* Top Politicians */}
          {topPoliticians.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="font-semibold text-white mb-3">Mas conectados</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {topPoliticians.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickQuery(`red de ${p.name}`)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-dark-700/50 hover:bg-dark-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300 truncate">{p.name}</span>
                      <span className="text-xs text-slate-500">{p.connections}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cypher Query */}
          {cypherQuery && (
            <div className="glass-card p-4">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Cypher generado
              </h3>
              <pre className="text-xs text-slate-400 bg-dark-800 rounded-lg p-3 overflow-x-auto">
                {cypherQuery}
              </pre>
            </div>
          )}

          {/* Legend */}
          <div className="glass-card p-4">
            <h3 className="font-semibold text-white mb-3">Leyenda</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-emerald-500" />
                <span className="text-slate-400">Interaccion positiva</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-red-500" />
                <span className="text-slate-400">Interaccion negativa</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-slate-500" />
                <span className="text-slate-400">Interaccion neutral</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NetworkExplorer
