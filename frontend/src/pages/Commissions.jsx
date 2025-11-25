import CommissionAnalyzer from '../components/CommissionAnalyzer'

function Commissions() {
  const features = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      title: 'Smart Briefing',
      desc: 'Resúmenes ejecutivos de sesiones completas',
      gradient: 'from-primary-500 to-primary-600'
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Posicionómetro',
      desc: 'Analiza posturas de diputados sobre temas específicos',
      gradient: 'from-accent-500 to-accent-600'
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      title: 'Quote Finder',
      desc: 'Encuentra citas textuales con contexto',
      gradient: 'from-emerald-500 to-emerald-600'
    }
  ]

  const tips = [
    { text: 'Para resúmenes: "Resume la Sesión 67" o "Briefing de la Sesión 70"' },
    { text: 'Para posiciones: "¿Cuál es la posición de [Diputado] sobre [tema]?"' },
    { text: 'Para citas: "Encuentra citas de [Diputado] sobre [tema]"' },
    { text: 'Para comparar: "Compara argumentos sobre [tema]"' }
  ]

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 mb-4">
            <span className="w-2 h-2 bg-accent-400 rounded-full mr-2 animate-pulse" />
            <span className="text-sm text-accent-300">Análisis de Transcripciones</span>
          </div>
          <h1 className="text-display text-slate-100 mb-4">Análisis de Comisiones</h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Explora transcripciones de sesiones del Congreso. Obtén resúmenes ejecutivos,
            analiza posiciones de diputados y encuentra citas específicas usando IA.
          </p>
        </div>

        {/* Features Info */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {features.map((feature, idx) => (
            <div key={idx} className="glass-card p-5 text-center group hover:border-white/10 transition-all">
              <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>
              <h3 className="font-medium text-slate-100">{feature.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Main Component */}
        <CommissionAnalyzer />

        {/* Tips */}
        <div className="mt-8 glass-card p-6">
          <h3 className="font-semibold text-slate-100 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cómo usar el analizador
          </h3>
          <ul className="space-y-2">
            {tips.map((tip, idx) => (
              <li key={idx} className="flex items-start">
                <svg className="w-5 h-5 text-accent-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-slate-400">{tip.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Available Sessions */}
        <div className="mt-6 glass-card p-6">
          <h3 className="font-semibold text-slate-100 mb-3">Sesiones Disponibles</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['67', '70', '72', '73'].map(session => (
              <div key={session} className="bg-dark-800 border border-slate-700 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-primary-400">Sesión {session}</p>
                <p className="text-xs text-slate-500 mt-1">Septiembre 2025</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Commissions
