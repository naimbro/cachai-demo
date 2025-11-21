import { Link } from 'react-router-dom'

function Home() {
  const stats = [
    { value: '155', label: 'Diputados' },
    { value: '2,535', label: 'Proyectos' },
    { value: '386K', label: 'Votaciones' },
    { value: '3', label: 'Anos de datos' },
  ]

  const features = [
    {
      title: 'Digital Twin',
      description: 'Conversa con el gemelo digital de un parlamentario. Conoce sus posiciones politicas basadas en votaciones reales.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      path: '/digital-twin',
      gradient: 'from-primary-500 to-primary-600',
    },
    {
      title: 'Prediccion de Voto',
      description: 'Predice como votarian los parlamentarios ante un nuevo proyecto usando embeddings e IA.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      path: '/predictor',
      gradient: 'from-accent-500 to-accent-600',
    },
    {
      title: 'Explorer',
      description: 'Busca proyectos de ley por similitud semantica. Encuentra legislacion relacionada.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      path: '/explorer',
      gradient: 'from-emerald-500 to-emerald-600',
    },
  ]

  const techStack = ['React', 'Firebase', 'OpenAI', 'Embeddings', 'Tailwind', 'Vite']

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 mb-6">
              <span className="w-2 h-2 bg-primary-400 rounded-full mr-2 animate-pulse" />
              <span className="text-sm text-primary-300">Demo Interactivo</span>
            </div>

            {/* Title */}
            <h1 className="text-display text-slate-100 mb-6">
              Inteligencia Artificial para el{' '}
              <span className="text-gradient">Congreso de Chile</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
              Explora gemelos digitales de parlamentarios, predice votaciones
              y busca proyectos de ley usando tecnologia de vanguardia.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/digital-twin" className="btn-primary inline-flex items-center justify-center">
                Comenzar Demo
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Ver en GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Bento Grid */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-h1 text-slate-100 mb-4">Funcionalidades</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Herramientas de IA para analisis parlamentario
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <Link
                key={idx}
                to={feature.path}
                className="glass-card-hover p-8 group"
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>

                {/* Content */}
                <h3 className="text-h3 text-slate-100 mb-3">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  {feature.description}
                </p>

                {/* Link */}
                <div className="flex items-center text-primary-400 text-sm font-medium group-hover:text-primary-300 transition-colors">
                  Explorar
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-h1 text-slate-100 mb-4">Como Funciona</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Pipeline de datos e inteligencia artificial
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Extraccion', desc: 'Datos de Camara, Senado y BCN' },
              { step: '02', title: 'Embeddings', desc: 'Vectorizacion semantica de proyectos' },
              { step: '03', title: 'Similitud', desc: 'Busqueda por distancia coseno' },
              { step: '04', title: 'Prediccion', desc: 'Analisis con GPT-4o-mini' },
            ].map((item, idx) => (
              <div key={idx} className="glass-card p-6 text-center">
                <div className="text-4xl font-bold text-gradient mb-4">{item.step}</div>
                <h3 className="text-slate-100 font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-h2 text-slate-100 mb-4">Stack Tecnologico</h2>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {techStack.map((tech, idx) => (
              <span
                key={idx}
                className="px-4 py-2 bg-dark-800/50 border border-white/5 rounded-full text-sm text-slate-300 hover:border-primary-500/30 hover:text-primary-300 transition-colors cursor-default"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
