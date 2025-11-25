import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { queryNetwork, getNetworkStats, getTopPoliticians } from '../services/api'

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const NODE_COLORS = {
  left:    '#3B82F6', // blue 500
  right:   '#EF4444', // red 500
  center:  '#9CA3AF', // gray 400
  unknown: '#6B7280', // gray 500
}

const EDGE_COLORS = {
  positive: '#3B82F6', // blue 500 (colorblind-safe)
  negative: '#F97316', // orange 400 (colorblind-safe)
  neutral:  '#6B7280', // gray 500
}

const RESPONSIVE_LIMITS = {
  desktop: { maxNodes: 50, maxEdges: 200, labelMode: 'always-small' },
  tablet:  { maxNodes: 35, maxEdges: 150, labelMode: 'hover' },
  mobile:  { maxNodes: 25, maxEdges: 100, labelMode: 'tap-only' },
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getResponsiveLimits() {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1024
  if (width >= 1024) return RESPONSIVE_LIMITS.desktop
  if (width >= 768) return RESPONSIVE_LIMITS.tablet
  return RESPONSIVE_LIMITS.mobile
}

function getNodeColor(node) {
  // Support both cluster (-1, 0, 1) and coalition string formats
  const cluster = node.cluster
  const coalition = node.coalition?.toLowerCase()

  if (cluster === -1 || coalition === 'izquierda') return NODE_COLORS.left
  if (cluster === 1 || coalition === 'derecha') return NODE_COLORS.right
  if (cluster === 0 || coalition === 'centro') return NODE_COLORS.center
  return NODE_COLORS.unknown
}

function getEdgeSentimentInfo(link) {
  const { pos_count = 0, neg_count = 0, neu_count = 0, sign } = link

  // If we have the old sign field and no counts, use it
  if (sign && pos_count === 0 && neg_count === 0 && neu_count === 0) {
    return {
      dominant: sign === 'positive' ? 'positive' : sign === 'negative' ? 'negative' : 'neutral',
      isMixed: false,
      pos_count: sign === 'positive' ? 1 : 0,
      neg_count: sign === 'negative' ? 1 : 0,
      total: 1,
    }
  }

  const total = pos_count + neg_count + neu_count
  if (total === 0) return { dominant: 'neutral', isMixed: false, pos_count: 0, neg_count: 0, total: 1 }

  const max = Math.max(pos_count, neg_count, neu_count)
  const dominant = max === pos_count ? 'positive' : max === neg_count ? 'negative' : 'neutral'

  // Check if mixed (both positive and negative present with significant counts)
  const isMixed = pos_count > 0 && neg_count > 0 && Math.min(pos_count, neg_count) / max > 0.3

  return { dominant, isMixed, pos_count, neg_count, total }
}

function getEdgeColor(link, isHighlighted = false, isFaded = false) {
  const info = getEdgeSentimentInfo(link)

  let alpha = 0.5
  if (isHighlighted) alpha = 0.9
  if (isFaded) alpha = 0.1

  // Mixed sentiment: use purple to indicate conflict
  if (info.isMixed) {
    return hexToRgba('#A855F7', alpha) // purple for mixed
  }

  const base = EDGE_COLORS[info.dominant]
  return hexToRgba(base, alpha)
}

function getEdgeWidth(link, isHighlighted = false) {
  const count = link.total_count || 1
  // Scale: 1 interaction = 0.8px, 10 = 1.8px, 100 = 2.8px
  const w = 0.8 + Math.log10(count + 1) * 1.0
  const base = Math.max(0.5, Math.min(5, w))
  return isHighlighted ? base * 1.5 : base
}

function getNodeSize(node, isFocus = false) {
  const degree = node.degree ?? 1
  let r = 4 + Math.sqrt(degree) * 1.5  // smaller nodes
  r = Math.max(4, Math.min(12, r))      // range: 4-12px radius
  return isFocus ? r * 1.3 : r
}

function computeDegree(nodes, links) {
  const degreeMap = new Map()
  for (const n of nodes) degreeMap.set(n.id, 0)
  for (const l of links) {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source
    const targetId = typeof l.target === 'object' ? l.target.id : l.target
    degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1)
    degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1)
  }
  for (const n of nodes) {
    n.degree = degreeMap.get(n.id) || 0
  }
}

function prePositionNodes(nodes) {
  const spreadX = 120
  for (const n of nodes) {
    const cluster = n.cluster
    const coalition = n.coalition?.toLowerCase()

    if (cluster === -1 || coalition === 'izquierda') {
      n.x = -spreadX + (Math.random() - 0.5) * 40
    } else if (cluster === 1 || coalition === 'derecha') {
      n.x = spreadX + (Math.random() - 0.5) * 40
    } else {
      n.x = (Math.random() - 0.5) * 30
    }
    n.y = (Math.random() - 0.5) * 60
  }
}

/**
 * Aggregate multiple links between same node pairs into single edges
 * with counts for positive, negative, neutral.
 * Preserves title and body from the first interaction as example.
 */
function aggregateLinks(links) {
  const edgeMap = new Map()

  for (const l of links) {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source
    const targetId = typeof l.target === 'object' ? l.target.id : l.target
    // Create canonical key (smaller id first for undirected aggregation)
    const key = sourceId < targetId ? `${sourceId}|${targetId}` : `${targetId}|${sourceId}`

    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        source: sourceId,
        target: targetId,
        pos_count: 0,
        neg_count: 0,
        neu_count: 0,
        total_count: 0,
        title: l.title || null,  // Keep first article title as example
        body: l.body || null,    // Keep first article body as example
      })
    }

    const edge = edgeMap.get(key)
    const sentiment = l.sign || 'neutral'
    if (sentiment === 'positive') edge.pos_count++
    else if (sentiment === 'negative') edge.neg_count++
    else edge.neu_count++
    edge.total_count++

    // If we didn't have title/body yet, try to get from this link
    if (!edge.title && l.title) edge.title = l.title
    if (!edge.body && l.body) edge.body = l.body
  }

  return Array.from(edgeMap.values())
}

/**
 * Find connected components and return only the relevant one:
 * - If focusNodeId provided, return component containing it
 * - Otherwise, return the largest component
 */
function filterToConnectedComponent(nodes, links, focusNodeId = null) {
  if (nodes.length === 0) return { nodes: [], links: [] }

  // Build adjacency list
  const adj = new Map()
  for (const n of nodes) adj.set(n.id, [])

  for (const l of links) {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source
    const targetId = typeof l.target === 'object' ? l.target.id : l.target
    if (adj.has(sourceId)) adj.get(sourceId).push(targetId)
    if (adj.has(targetId)) adj.get(targetId).push(sourceId)
  }

  // Find all connected components using BFS
  const visited = new Set()
  const components = []

  for (const node of nodes) {
    if (visited.has(node.id)) continue

    const component = []
    const queue = [node.id]
    visited.add(node.id)

    while (queue.length > 0) {
      const current = queue.shift()
      component.push(current)

      for (const neighbor of adj.get(current) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push(neighbor)
        }
      }
    }

    components.push(component)
  }

  // If only one component, return as-is
  if (components.length <= 1) {
    return { nodes, links }
  }

  // Select component: one with focus node, or largest
  let selectedComponent
  if (focusNodeId) {
    selectedComponent = components.find(c => c.includes(focusNodeId))
  }
  if (!selectedComponent) {
    // Pick largest component
    selectedComponent = components.reduce((a, b) => a.length >= b.length ? a : b)
  }

  const keepIds = new Set(selectedComponent)
  const filteredNodes = nodes.filter(n => keepIds.has(n.id))
  const filteredLinks = links.filter(l => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source
    const targetId = typeof l.target === 'object' ? l.target.id : l.target
    return keepIds.has(sourceId) && keepIds.has(targetId)
  })

  return { nodes: filteredNodes, links: filteredLinks }
}

function trimGraphData(nodes, links, maxNodes, maxEdges, focusNodeId = null) {
  // First aggregate links between same node pairs
  const aggregatedLinks = aggregateLinks(links)

  // Filter to single connected component (containing focus node or largest)
  const { nodes: connectedNodes, links: connectedLinks } = filterToConnectedComponent(
    nodes,
    aggregatedLinks,
    focusNodeId
  )

  // If within limits, return as-is
  if (connectedNodes.length <= maxNodes && connectedLinks.length <= maxEdges) {
    return { nodes: connectedNodes, links: connectedLinks }
  }

  // Compute degrees for sorting
  computeDegree(connectedNodes, connectedLinks)

  // Keep most connected nodes
  const sortedNodes = [...connectedNodes].sort((a, b) => (b.degree || 0) - (a.degree || 0))
  const trimmedNodes = sortedNodes.slice(0, maxNodes)
  const nodeIds = new Set(trimmedNodes.map(n => n.id))

  // Filter links to only include trimmed nodes
  let trimmedLinks = connectedLinks.filter(l => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source
    const targetId = typeof l.target === 'object' ? l.target.id : l.target
    return nodeIds.has(sourceId) && nodeIds.has(targetId)
  })

  // Trim edges if still too many (keep highest count)
  if (trimmedLinks.length > maxEdges) {
    trimmedLinks = trimmedLinks
      .sort((a, b) => (b.total_count || 1) - (a.total_count || 1))
      .slice(0, maxEdges)
  }

  return { nodes: trimmedNodes, links: trimmedLinks }
}

function isEdgeIncidentTo(link, nodeId) {
  const sourceId = typeof link.source === 'object' ? link.source.id : link.source
  const targetId = typeof link.target === 'object' ? link.target.id : link.target
  return sourceId === nodeId || targetId === nodeId
}

function shouldShowLabel(node, nodesLength, hoverNodeId, selectedNodeId, focusNodeId) {
  if (nodesLength <= 25) return true
  if (node.id === hoverNodeId) return true
  if (node.id === selectedNodeId) return true
  if (node.id === focusNodeId) return true
  return false
}

function formatLinkTooltip(link) {
  const sourceId = typeof link.source === 'object' ? link.source.id : link.source
  const targetId = typeof link.target === 'object' ? link.target.id : link.target
  const info = getEdgeSentimentInfo(link)

  let tooltip = `${sourceId} ↔ ${targetId}\n`
  tooltip += `Interacciones: ${info.total}\n`

  if (info.pos_count > 0) tooltip += `Positivas: ${info.pos_count} `
  if (info.neg_count > 0) tooltip += `Negativas: ${info.neg_count} `
  if (info.isMixed) tooltip += `(Relación mixta)`

  // Add article title and body if available
  if (link.title) {
    tooltip += `\n\n📰 ${link.title}`
  }
  if (link.body) {
    // Truncate body to max 150 chars for tooltip
    const bodyPreview = link.body.length > 150
      ? link.body.substring(0, 150) + '...'
      : link.body
    tooltip += `\n\n${bodyPreview}`
  }

  return tooltip
}

// =============================================================================
// LEGEND COMPONENT
// =============================================================================

function NetworkLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-300 mb-4">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.left }} />
        Izquierda
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.right }} />
        Derecha
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.center }} />
        Centro
      </div>
      <div className="flex items-center gap-2 ml-4">
        <span className="w-6 h-[2px]" style={{ backgroundColor: EDGE_COLORS.positive }} />
        Positiva
      </div>
      <div className="flex items-center gap-2">
        <span className="w-6 h-[2px]" style={{ backgroundColor: EDGE_COLORS.negative }} />
        Negativa
      </div>
      <div className="flex items-center gap-2">
        <span className="w-6 h-[2px]" style={{ backgroundColor: '#A855F7' }} />
        Mixta
      </div>
    </div>
  )
}

// =============================================================================
// NODE DETAILS PANEL
// =============================================================================

function NodeDetailsPanel({ node, links, onExplore }) {
  if (!node) return null

  const coalition = node.coalition || (node.cluster === -1 ? 'Izquierda' : node.cluster === 1 ? 'Derecha' : 'Centro')
  const colorClass = coalition === 'Izquierda' ? 'text-blue-400' :
                     coalition === 'Derecha' ? 'text-red-400' : 'text-gray-400'

  // Find top neighbors
  const neighborCounts = {}
  for (const l of links) {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source
    const targetId = typeof l.target === 'object' ? l.target.id : l.target

    if (sourceId === node.id) {
      neighborCounts[targetId] = (neighborCounts[targetId] || 0) + (l.total_count || 1)
    } else if (targetId === node.id) {
      neighborCounts[sourceId] = (neighborCounts[sourceId] || 0) + (l.total_count || 1)
    }
  }

  const topNeighbors = Object.entries(neighborCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div className="glass-card p-4">
      <h3 className="font-semibold text-white mb-2">Politico seleccionado</h3>
      <div className="space-y-2">
        <p className="text-lg text-primary-400">{node.name}</p>
        <p className="text-sm text-slate-400">
          Coalicion: <span className={colorClass}>{coalition}</span>
        </p>
        <p className="text-sm text-slate-400">
          Conexiones: {node.degree || 0}
        </p>
        {topNeighbors.length > 0 && (
          <div className="text-sm text-slate-400">
            <p className="mb-1">Principales interacciones:</p>
            <ul className="text-xs space-y-1">
              {topNeighbors.map(([id, count]) => (
                <li key={id} className="text-slate-500">
                  {id}: {count} interacciones
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={() => onExplore(node.name)}
          className="w-full btn-secondary text-sm mt-2"
        >
          Ver red de {node.name.split(' ')[0]}
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function NetworkExplorer() {
  const [query, setQuery] = useState('')
  const [rawGraphData, setRawGraphData] = useState({ nodes: [], links: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cypherQuery, setCypherQuery] = useState('')
  const [narrative, setNarrative] = useState(null)
  const [intent, setIntent] = useState(null)
  const [stats, setStats] = useState(null)
  const [topPoliticians, setTopPoliticians] = useState([])
  const [hoverNodeId, setHoverNodeId] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)

  const graphRef = useRef()
  const containerRef = useRef()
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })

  // Track window width for responsive behavior
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
          height: Math.max(400, Math.min(600, window.innerHeight - 400))
        })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Process graph data with responsive limits
  const { nodes, links, focusNodeId, isTooLarge } = useMemo(() => {
    if (!rawGraphData.nodes.length) {
      return { nodes: [], links: [], focusNodeId: null, isTooLarge: false }
    }

    // Check if too large
    if (rawGraphData.nodes.length > 300 || rawGraphData.links.length > 800) {
      return { nodes: [], links: [], focusNodeId: null, isTooLarge: true }
    }

    // Find focus node FIRST (before trimming) so we can keep its component
    let focusId = null
    const person = intent?.person || query
    if (person) {
      const match = rawGraphData.nodes.find(n =>
        n.name.toLowerCase().includes(person.toLowerCase()) || n.isFocus
      )
      focusId = match?.id ?? null
    }

    const limits = getResponsiveLimits()
    const { nodes: trimmedNodes, links: trimmedLinks } = trimGraphData(
      [...rawGraphData.nodes],
      [...rawGraphData.links],
      limits.maxNodes,
      limits.maxEdges,
      focusId  // Pass focus node to keep its connected component
    )

    // Compute degree
    computeDegree(trimmedNodes, trimmedLinks)

    // Pre-position for left/right separation
    prePositionNodes(trimmedNodes)

    // Verify focus node is still in trimmed data
    if (focusId && !trimmedNodes.find(n => n.id === focusId)) {
      focusId = null
    }

    return {
      nodes: trimmedNodes,
      links: trimmedLinks,
      focusNodeId: focusId,
      isTooLarge: false
    }
  }, [rawGraphData, windowWidth, intent, query])

  const activeNodeId = selectedNodeId ?? hoverNodeId

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
    e?.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setSelectedNodeId(null)
    setHoverNodeId(null)
    setNarrative(null)

    try {
      const result = await queryNetwork(query)
      setRawGraphData(result.graph)
      setCypherQuery(result.cypher)
      setNarrative(result.narrative)
      setIntent(result.intent || null)

      // Zoom to fit after rendering
      if (graphRef.current) {
        setTimeout(() => {
          graphRef.current.zoomToFit(400, 50)
        }, 100)
      }
    } catch (err) {
      setError(err.message || 'Error al consultar la red')
      setRawGraphData({ nodes: [], links: [] })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickQuery = (queryText) => {
    setQuery(queryText)
    setIsLoading(true)
    setError(null)
    setSelectedNodeId(null)
    setHoverNodeId(null)
    setNarrative(null)

    queryNetwork(queryText)
      .then(result => {
        setRawGraphData(result.graph)
        setCypherQuery(result.cypher)
        setNarrative(result.narrative)
        setIntent(result.intent || null)
        if (graphRef.current) {
          setTimeout(() => graphRef.current.zoomToFit(400, 50), 100)
        }
      })
      .catch(err => {
        setError(err.message || 'Error al consultar la red')
        setRawGraphData({ nodes: [], links: [] })
      })
      .finally(() => setIsLoading(false))
  }

  const handleNodeClick = useCallback((node) => {
    setSelectedNodeId(prev => prev === node.id ? null : node.id)

    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 300)
      if (windowWidth < 768) {
        graphRef.current.zoom(4, 300)
      } else {
        graphRef.current.zoom(2, 300)
      }
    }
  }, [windowWidth])

  const handleNodeHover = useCallback((node) => {
    setHoverNodeId(node?.id ?? null)
  }, [])

  // Custom node renderer
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isFocus = node.id === focusNodeId || node.isFocus
    const isHovered = node.id === hoverNodeId
    const isSelected = node.id === selectedNodeId
    const radius = getNodeSize(node, isFocus)
    const color = getNodeColor(node)

    // Outer glow for focus node
    if (isFocus) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI, false)
      ctx.fillStyle = 'rgba(251, 191, 36, 0.35)' // amber glow
      ctx.fill()
    }

    // Highlight ring for hovered/selected
    if (isHovered || isSelected) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI, false)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.lineWidth = 2 / globalScale
      ctx.stroke()
    }

    // Main circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)
    ctx.fillStyle = color
    ctx.fill()

    // Thin stroke for all nodes
    ctx.lineWidth = 1 / globalScale
    ctx.strokeStyle = '#0F172A' // slate-900
    ctx.stroke()

    // Label
    if (shouldShowLabel(node, nodes.length, hoverNodeId, selectedNodeId, focusNodeId)) {
      const label = node.name
      const fontSize = Math.min(14, 12 / globalScale)
      ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`

      // Text shadow for contrast
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
      ctx.fillText(label, node.x + radius + 4 + 1 / globalScale, node.y + 1 / globalScale)

      // Main text
      ctx.fillStyle = '#E5E7EB' // slate-200
      ctx.fillText(label, node.x + radius + 4, node.y)
    }
  }, [nodes.length, hoverNodeId, selectedNodeId, focusNodeId])

  // Link color with highlighting
  const getLinkColor = useCallback((link) => {
    if (!activeNodeId) return getEdgeColor(link, false, false)
    const isIncident = isEdgeIncidentTo(link, activeNodeId)
    return getEdgeColor(link, isIncident, !isIncident)
  }, [activeNodeId])

  // Link width with highlighting
  const getLinkWidth = useCallback((link) => {
    if (!activeNodeId) return getEdgeWidth(link, false)
    const isIncident = isEdgeIncidentTo(link, activeNodeId)
    return getEdgeWidth(link, isIncident)
  }, [activeNodeId])

  const quickQueries = [
    { label: 'Red de Boric', query: 'red de Gabriel Boric' },
    { label: 'Red de Matthei', query: 'red de Evelyn Matthei' },
    { label: 'Alianzas izquierda', query: 'alianzas dentro de la izquierda' },
    { label: 'Conflictos de Kast', query: 'interacciones negativas de Kast' },
  ]

  const isMobile = windowWidth < 768

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          <span className="text-gradient">Network Explorer</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Explora la red de interacciones entre politicos chilenos.
          Usa lenguaje natural para consultar la red.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.politicians?.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Politicos</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.interactions?.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Interacciones</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: EDGE_COLORS.positive }}>{stats.bySign?.positive?.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Positivas</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: EDGE_COLORS.negative }}>{stats.bySign?.negative?.toLocaleString()}</div>
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

      {/* Too Large Warning */}
      {isTooLarge && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-400">
          <p className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            La red es demasiado densa para visualizarla. Afina tu consulta (por ano, sentimiento, o actores especificos).
          </p>
        </div>
      )}

      {/* Graph Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Graph */}
        <div className="lg:col-span-3 glass-card p-4" ref={containerRef}>
          {nodes.length > 0 ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div className="text-sm text-slate-400">
                  {nodes.length} nodos, {links.length} conexiones
                </div>
                <NetworkLegend />
              </div>
              <div className="bg-slate-900/60 rounded-2xl border border-slate-700 shadow-lg overflow-hidden" style={{ height: dimensions.height }}>
                <ForceGraph2D
                  ref={graphRef}
                  graphData={{ nodes, links }}
                  width={dimensions.width - 32}
                  height={dimensions.height}
                  nodeCanvasObject={nodeCanvasObject}
                  nodePointerAreaPaint={(node, color, ctx) => {
                    const radius = getNodeSize(node, node.id === focusNodeId) + 4
                    ctx.fillStyle = color
                    ctx.beginPath()
                    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)
                    ctx.fill()
                  }}
                  linkColor={getLinkColor}
                  linkWidth={getLinkWidth}
                  linkLabel={formatLinkTooltip}
                  linkDirectionalArrowLength={3}
                  linkDirectionalArrowRelPos={1}
                  onNodeClick={handleNodeClick}
                  onNodeHover={handleNodeHover}
                  cooldownTicks={120}
                  onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
                  d3VelocityDecay={0.3}
                  backgroundColor="transparent"
                  enableNodeDrag={!isMobile}
                  enablePanInteraction={true}
                  enableZoomInteraction={true}
                />
              </div>
            </>
          ) : !isTooLarge && (
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
          {selectedNodeId && (
            <NodeDetailsPanel
              node={nodes.find(n => n.id === selectedNodeId)}
              links={links}
              onExplore={(name) => handleQuickQuery(`red de ${name}`)}
            />
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
              <pre className="text-xs text-slate-400 bg-dark-800 rounded-lg p-3 overflow-x-auto max-h-32">
                {cypherQuery}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NetworkExplorer
