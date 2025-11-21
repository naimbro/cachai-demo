import logoImg from '../assets/logo-cachai.png'

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-dark-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <img
                src={logoImg}
                alt="CachAI"
                className="h-12 md:h-32 w-auto"
              />
            </div>
            <p className="text-slate-400 text-sm max-w-md">
              Demo de inteligencia artificial aplicada al analisis parlamentario chileno.
              Prediccion de votos y gemelos digitales de diputados.
            </p>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-slate-200 font-medium mb-4">Caracteristicas</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="hover:text-slate-300 transition-colors">Digital Twin conversacional</li>
              <li className="hover:text-slate-300 transition-colors">Prediccion de votos con IA</li>
              <li className="hover:text-slate-300 transition-colors">Busqueda semantica</li>
            </ul>
          </div>

          {/* Tech */}
          <div>
            <h3 className="text-slate-200 font-medium mb-4">Tecnologias</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>React + Vite</li>
              <li>Firebase Functions</li>
              <li>OpenAI GPT-4o-mini</li>
              <li>Embeddings Semanticos</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} CachAI. Proyecto de codigo abierto.
          </p>
          <div className="flex items-center space-x-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer"
               className="text-slate-500 hover:text-slate-300 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
