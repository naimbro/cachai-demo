import VotePredictor from '../components/VotePredictor'

function Predictor() {
  const exampleProjects = [
    {
      title: 'Proyecto de Proteccion de Datos',
      text: 'Proyecto de ley que establece normas sobre proteccion y tratamiento de datos personales, creando la Agencia de Proteccion de Datos Personales como organo autonomo encargado de velar por el cumplimiento de la normativa. Se establecen derechos ARCO para los titulares de datos y obligaciones para los responsables del tratamiento.'
    },
    {
      title: 'Reforma de Pensiones',
      text: 'Proyecto que modifica el sistema de pensiones, estableciendo un componente de ahorro colectivo solidario financiado con aportes del empleador. Se crea un fondo comun que complementa las pensiones autofinanciadas, con foco en mejorar las jubilaciones de los sectores medios y bajos.'
    },
    {
      title: 'Ley de Energias Renovables',
      text: 'Proyecto que promueve la generacion distribuida de energia electrica a partir de fuentes renovables no convencionales. Establece incentivos tributarios para la instalacion de paneles solares y pequenas turbinas eolicas, y obliga a las distribuidoras a comprar los excedentes de energia inyectados a la red.'
    }
  ]

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 mb-4">
            <span className="w-2 h-2 bg-accent-400 rounded-full mr-2 animate-pulse" />
            <span className="text-sm text-accent-300">Machine Learning</span>
          </div>
          <h1 className="text-display text-slate-100 mb-4">Prediccion de Votos</h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Ingresa el texto de un proyecto de ley y el sistema predecira como votarian
            los parlamentarios basandose en su historial y proyectos similares.
          </p>
        </div>

        {/* How it works */}
        <div className="glass-card p-6 mb-8 bg-gradient-to-br from-primary-500/5 to-accent-500/5">
          <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Como funciona
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Analisis Semantico', desc: 'El texto se convierte en un embedding vectorial' },
              { step: '02', title: 'Busqueda de Similares', desc: 'Se encuentran proyectos historicos similares' },
              { step: '03', title: 'Prediccion con IA', desc: 'GPT analiza patrones de votacion' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 text-white rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-lg shadow-primary-500/20">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-medium text-slate-100">{item.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Predictor Component */}
        <VotePredictor />

        {/* Example texts */}
        <div className="mt-8 glass-card p-6">
          <h3 className="font-semibold text-slate-100 mb-2 flex items-center">
            <svg className="w-5 h-5 mr-2 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Ejemplos de Proyectos
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Puedes copiar y pegar estos ejemplos para probar el sistema:
          </p>
          <div className="space-y-4">
            {exampleProjects.map((project, idx) => (
              <div key={idx} className="p-4 bg-dark-800/50 border border-white/5 rounded-xl hover:border-white/10 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-200 mb-2 flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary-400 rounded-full mr-2" />
                      {project.title}
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {project.text}
                    </p>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(project.text)}
                    className="btn-ghost opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    title="Copiar texto"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Predictor
