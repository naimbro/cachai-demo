import BillExplorer from '../components/BillExplorer'

function Explorer() {
  const features = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'Busqueda Inteligente',
      desc: 'Entiende el significado, no solo palabras',
      gradient: 'from-primary-500 to-primary-600'
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      title: 'Por Tematica',
      desc: 'Busca por materias o areas legislativas',
      gradient: 'from-accent-500 to-accent-600'
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Score de Similitud',
      desc: 'Ve que tan relacionado esta cada resultado',
      gradient: 'from-emerald-500 to-emerald-600'
    }
  ]

  const searchTips = [
    { text: 'Usa terminos generales para busquedas amplias: "salud", "educacion", "economia"' },
    { text: 'Se especifico para resultados mas precisos: "proteccion datos personales", "reforma pensiones AFP"' },
    { text: 'Puedes buscar por el problema que aborda: "contaminacion atmosferica", "violencia de genero"' },
    { text: 'Los resultados se ordenan automaticamente por relevancia semantica' }
  ]

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
            <span className="text-sm text-emerald-300">Busqueda Semantica</span>
          </div>
          <h1 className="text-display text-slate-100 mb-4">Explorer de Proyectos</h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Busca proyectos de ley por similitud semantica. El sistema utiliza embeddings
            vectoriales para encontrar legislacion relacionada con tu busqueda.
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

        {/* Explorer Component */}
        <BillExplorer />

        {/* Search Tips */}
        <div className="mt-8 glass-card p-6">
          <h3 className="font-semibold text-slate-100 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tips de Busqueda
          </h3>
          <ul className="space-y-3">
            {searchTips.map((tip, idx) => (
              <li key={idx} className="flex items-start space-x-3 text-sm">
                <span className="w-1.5 h-1.5 bg-primary-400 rounded-full mt-2 flex-shrink-0" />
                <span className="text-slate-400">{tip.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Explorer
