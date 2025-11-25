import { useState } from 'react';

// Using Cloud Run URL from backend-lite deployment
const BACKEND_URL = import.meta.env.PROD
  ? 'https://analyzecommissiontranscripts-rhatf7l73a-uc.a.run.app'
  : 'http://localhost:5001/diputados-demo/us-central1/analyzeCommissionTranscripts';

function CommissionAnalyzer() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Quick query suggestions
  const quickQueries = [
    { label: 'Posición de Félix González', query: 'Cuál es la posición de Félix González sobre protección de rompientes' },
    { label: 'Resume Sesión 67', query: 'Resume la Sesión 67' },
    { label: 'Citas de Agustín Romero', query: 'Encuentra citas de Agustín Romero sobre burocracia' },
    { label: 'Compara argumentos', query: 'Compara argumentos a favor vs en contra sobre protección de rompientes' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('[Commission Analyzer] Sending request to:', BACKEND_URL);
      console.log('[Commission Analyzer] Query:', query.trim());

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      });

      console.log('[Commission Analyzer] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Commission Analyzer] Error response:', errorText);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Commission Analyzer] Data received:', data);

      if (data.error) {
        console.error('[Commission Analyzer] API error:', data.error);
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error('[Commission Analyzer] Exception:', err);
      setError(err.message || 'Error al analizar la consulta');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuery = (queryText) => {
    setQuery(queryText);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Input Section */}
      <div className="glass-card p-6 mb-6">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: ¿Cuál es la posición de Félix González sobre protección de rompientes?"
              className="flex-1 px-4 py-3 bg-dark-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-medium hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analizando...
                </div>
              ) : (
                'Analizar'
              )}
            </button>
          </div>
        </form>

        {/* Quick Queries */}
        <div className="mt-4 flex flex-wrap gap-2">
          {quickQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickQuery(q.query)}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-dark-800 border border-slate-700 text-slate-300 rounded-md hover:border-primary-500 hover:text-primary-400 transition-colors disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="glass-card p-4 border-red-500/30 bg-red-500/5 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-red-300 font-medium">Error</p>
              <p className="text-red-400/80 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-6">
          <div className="glass-card p-3 bg-blue-500/5 border-blue-500/30 text-xs text-slate-400">
            <strong>Debug:</strong> Intent type = {result.intent?.type} | Success = {result.success?.toString()}
          </div>

          {result.intent?.type === 'position' && <PositionResult data={result} />}
          {result.intent?.type === 'quote' && <QuoteResult data={result} />}
          {result.intent?.type === 'briefing' && <BriefingResult data={result} />}
          {result.intent?.type === 'comparison' && <ComparisonResult data={result} />}
          {(result.intent?.type === 'search' || result.intent?.type === 'session_search') && <SearchResult data={result} />}

          {!result.intent?.type && (
            <div className="glass-card p-6 text-center">
              <p className="text-slate-400">Tipo de consulta no reconocido</p>
              <pre className="text-xs text-slate-500 mt-2 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Position Result Component
function PositionResult({ data }) {
  const response = data.narrative || data.structured_data || {};
  const { metadata } = data;
  const positionColor = {
    'A FAVOR': 'emerald',
    'EN CONTRA': 'red',
    'NEUTRO': 'slate',
    'MIXTO': 'amber',
    'NO SE PRONUNCIÓ': 'slate'
  }[response.position] || 'slate';

  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-100 mb-1">{response.deputy}</h3>
          <p className="text-sm text-slate-400">Sesión {response.session}</p>
        </div>
        <div className={`px-4 py-2 rounded-lg bg-${positionColor}-500/10 border border-${positionColor}-500/30`}>
          <p className={`text-${positionColor}-400 font-bold`}>{response.position}</p>
          <p className="text-xs text-slate-400 mt-0.5">{response.conviction_level}</p>
        </div>
      </div>

      {response.key_quote && (
        <div className="bg-dark-800 border border-slate-700 rounded-lg p-4 mb-4">
          <p className="text-slate-300 italic">"{response.key_quote}"</p>
        </div>
      )}

      {response.main_arguments && response.main_arguments.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3">Argumentos principales:</h4>
          <ul className="space-y-2">
            {response.main_arguments.map((arg, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-400">
                <span className="text-primary-400 mt-1">•</span>
                <span>{arg}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {response.nuance && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-sm text-slate-400">
            <span className="font-medium text-slate-300">Matices:</span> {response.nuance}
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-slate-500">
        {metadata.chunks_analyzed} fragmentos analizados • {metadata.model}
      </div>
    </div>
  );
}

// Quote Result Component
function QuoteResult({ data }) {
  const response = data.narrative || data.structured_data || {};
  const { metadata } = data;

  if (!response.found) {
    return (
      <div className="glass-card p-6 text-center">
        <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-slate-400">{response.summary || 'No se encontraron citas relevantes'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {response.quotes.map((quote, idx) => (
        <div key={idx} className="glass-card p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm text-slate-400">Sesión {quote.session}</span>
            <span className="text-xs px-2 py-1 bg-primary-500/10 border border-primary-500/30 rounded text-primary-400">
              Cita {idx + 1}
            </span>
          </div>

          <div className="bg-dark-800 border border-slate-700 rounded-lg p-4 mb-3">
            <p className="text-slate-300 italic leading-relaxed">"{quote.text}"</p>
          </div>

          {quote.context && (
            <p className="text-sm text-slate-400 mb-2">
              <span className="font-medium text-slate-300">Contexto:</span> {quote.context}
            </p>
          )}

          {quote.relevance && (
            <p className="text-sm text-slate-400">
              <span className="font-medium text-slate-300">Relevancia:</span> {quote.relevance}
            </p>
          )}
        </div>
      ))}

      {response.summary && (
        <div className="glass-card p-5 bg-primary-500/5">
          <p className="text-sm font-medium text-primary-300 mb-2">Resumen</p>
          <p className="text-slate-300">{response.summary}</p>
        </div>
      )}

      <div className="text-xs text-slate-500 text-center">
        {metadata.chunks_analyzed} fragmentos analizados • {metadata.model}
      </div>
    </div>
  );
}

// Briefing Result Component
function BriefingResult({ data }) {
  const response = data.narrative || data.structured_data || {};

  return (
    <div className="glass-card p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-2xl font-bold text-slate-100">Sesión {response.session}</h3>
          {response.date && <span className="text-sm text-slate-400">{response.date}</span>}
        </div>
        {response.project_id && (
          <p className="text-sm text-primary-400">Boletín {response.project_id}</p>
        )}
      </div>

      {response.executive_summary && (
        <div className="bg-primary-500/5 border border-primary-500/20 rounded-lg p-4 mb-6">
          <p className="text-slate-300 leading-relaxed">{response.executive_summary}</p>
        </div>
      )}

      <div className="space-y-6">
        {response.main_topic && (
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Tema Principal</h4>
            <p className="text-slate-400">{response.main_topic}</p>
          </div>
        )}

        {response.positions && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* A Favor */}
            {response.positions.a_favor && response.positions.a_favor.length > 0 && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-emerald-400 mb-3">A Favor</h4>
                <ul className="space-y-3">
                  {response.positions.a_favor.map((pos, idx) => (
                    <li key={idx}>
                      <p className="text-slate-300 font-medium">{pos.deputy}</p>
                      <p className="text-sm text-slate-400 mt-1">{pos.main_argument}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* En Contra */}
            {response.positions.en_contra && response.positions.en_contra.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-400 mb-3">En Contra</h4>
                <ul className="space-y-3">
                  {response.positions.en_contra.map((pos, idx) => (
                    <li key={idx}>
                      <p className="text-slate-300 font-medium">{pos.deputy}</p>
                      <p className="text-sm text-slate-400 mt-1">{pos.main_argument}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {response.key_moments && response.key_moments.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-3">Momentos Clave</h4>
            <ul className="space-y-2">
              {response.key_moments.map((moment, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-400">
                  <span className="text-accent-400 mt-1">→</span>
                  <span>{moment}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {response.key_deputies && response.key_deputies.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Diputados Clave</h4>
            <div className="flex flex-wrap gap-2">
              {response.key_deputies.map((dep, idx) => (
                <span key={idx} className="px-3 py-1 text-sm bg-dark-800 border border-slate-700 rounded-full text-slate-300">
                  {dep}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Comparison Result Component
function ComparisonResult({ data }) {
  const response = data.narrative || data.structured_data || {};

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-xl font-semibold text-slate-100 mb-4">{response.topic}</h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* A Favor */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <h4 className="font-semibold text-emerald-400">A Favor</h4>
            </div>

            {response.a_favor.deputies && (
              <p className="text-sm text-slate-400 mb-3">
                {response.a_favor.deputies.join(', ')}
              </p>
            )}

            {response.a_favor.arguments.map((arg, idx) => (
              <div key={idx} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                <p className="text-xs text-emerald-400 uppercase font-medium mb-2">{arg.category}</p>
                <p className="text-slate-300 mb-2">{arg.argument}</p>
                {arg.quote && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/20">
                    <p className="text-sm text-slate-400 italic">"{arg.quote}"</p>
                    <p className="text-xs text-slate-500 mt-1">— {arg.deputy}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* En Contra */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <h4 className="font-semibold text-red-400">En Contra</h4>
            </div>

            {response.en_contra.deputies && (
              <p className="text-sm text-slate-400 mb-3">
                {response.en_contra.deputies.join(', ')}
              </p>
            )}

            {response.en_contra.arguments.map((arg, idx) => (
              <div key={idx} className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                <p className="text-xs text-red-400 uppercase font-medium mb-2">{arg.category}</p>
                <p className="text-slate-300 mb-2">{arg.argument}</p>
                {arg.quote && (
                  <div className="mt-3 pt-3 border-t border-red-500/20">
                    <p className="text-sm text-slate-400 italic">"{arg.quote}"</p>
                    <p className="text-xs text-slate-500 mt-1">— {arg.deputy}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {response.synthesis && (
          <div className="mt-6 pt-6 border-t border-slate-700">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Síntesis</h4>
            <p className="text-slate-400">{response.synthesis}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Search Result Component
function SearchResult({ data }) {
  const chunks = data.structured_data?.results || data.structured_data?.chunks || data.chunks || [];

  return (
    <div className="space-y-3">
      {chunks.map((chunk, idx) => (
        <div key={idx} className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-300">{chunk.speaker}</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Sesión {chunk.session}</span>
              <span className="text-xs px-2 py-0.5 bg-primary-500/10 border border-primary-500/30 rounded text-primary-400">
                Fragmento {idx + 1}
              </span>
            </div>
          </div>
          <p className="text-slate-400 text-sm">{chunk.text}</p>
        </div>
      ))}
    </div>
  );
}

export default CommissionAnalyzer;
