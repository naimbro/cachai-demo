import { useState, useRef, useEffect } from 'react'
import { digitalTwinQuery } from '../services/api'

function DigitalTwinChat({ parlamentario, onClose, isMobile }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesContainerRef = useRef(null)

  const scrollToBottom = () => {
    // Scroll only within the messages container, not the whole page
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    // Small delay to ensure DOM is updated
    setTimeout(scrollToBottom, 100)
  }, [messages])

  useEffect(() => {
    // Welcome message when parlamentario changes
    if (parlamentario) {
      setMessages([{
        type: 'ai',
        content: `Hola, soy el gemelo digital de ${parlamentario.nombre}. Puedo responder preguntas sobre mis posiciones politicas, votaciones y proyectos de ley. ¿En que te puedo ayudar?`,
        references: []
      }])
    }
  }, [parlamentario])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || !parlamentario) return

    const userMessage = input.trim()
    setInput('')

    // Build conversation history for context (exclude welcome message)
    const conversationHistory = messages
      .filter(m => m.type === 'user' || (m.type === 'ai' && messages.indexOf(m) > 0))
      .map(m => ({ type: m.type, content: m.content }))

    setMessages(prev => [...prev, { type: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const data = await digitalTwinQuery(parlamentario.id, userMessage, conversationHistory)
      setMessages(prev => [...prev, {
        type: 'ai',
        content: data.respuesta,
        references: data.referencias || [],
        temasVotados: data.temasVotados || [],
        hasVotedOnSimilar: data.hasVotedOnSimilar
      }])
    } catch (error) {
      console.error('Error:', error)
      // Fallback response
      const stats = parlamentario.estadisticas_voto
      const tendency = stats && stats.a_favor > stats.en_contra ? 'favorable' : 'critica'
      setMessages(prev => [...prev, {
        type: 'ai',
        content: `Como ${parlamentario.nombre} del ${parlamentario.partido}, mi posicion sobre "${userMessage}" refleja mi trayectoria legislativa. He mantenido una postura ${tendency} hacia este tipo de iniciativas, siempre en linea con los intereses de mis electores.`,
        references: []
      }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!parlamentario) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-dark-700 flex items-center justify-center">
          <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-slate-400 text-lg">Selecciona un parlamentario para iniciar la conversacion</p>
        <p className="text-slate-500 text-sm mt-2">Elige de la lista a la izquierda</p>
      </div>
    )
  }

  return (
    <div className={`overflow-hidden flex flex-col ${isMobile ? 'h-full' : 'glass-card h-[600px]'}`}>
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 sm:px-6 py-4 flex items-center space-x-3 sm:space-x-4">
        {/* Back button - mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {parlamentario.foto ? (
          <img
            src={parlamentario.foto}
            alt={parlamentario.nombre}
            className="w-12 h-12 rounded-xl object-cover border-2 border-white/20"
            onError={(e) => {
              e.target.onerror = null
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(parlamentario.nombre)}&background=3b82f6&color=fff`
            }}
          />
        ) : (
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">{parlamentario.nombre.charAt(0)}</span>
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-white">{parlamentario.nombre}</h3>
          <p className="text-sm text-primary-200">{parlamentario.partido}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-sm text-primary-200">En linea</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-grow overflow-y-auto p-6 space-y-4 scrollbar-thin">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[80%] ${msg.type === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              {/* Show relevant bills */}
              {msg.references && msg.references.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs font-medium text-slate-400 mb-3 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Proyectos relevantes
                  </p>
                  <div className="space-y-3">
                    {msg.references.map((ref, i) => (
                      <div key={i} className="bg-dark-700/50 rounded-lg p-2">
                        <div className="flex items-start space-x-2 text-sm">
                          <span className="w-1.5 h-1.5 bg-primary-400 rounded-full flex-shrink-0 mt-1.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-slate-300 block">{ref.titulo}</span>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="badge-primary text-xs">{Math.round(ref.relevancia * 100)}%</span>
                              {ref.estado && (
                                <span className="text-xs text-slate-500">{ref.estado}</span>
                              )}
                              {ref.voto && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  ref.voto === 'a favor' ? 'bg-emerald-500/20 text-emerald-400' :
                                  ref.voto === 'en contra' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  Voto: {ref.voto}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Show suggested voted topics when no votes on similar bills */}
              {msg.temasVotados && msg.temasVotados.length > 0 && !msg.hasVotedOnSimilar && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs font-medium text-accent-400 mb-3 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Temas en los que he votado
                  </p>
                  <div className="space-y-2">
                    {msg.temasVotados.map((tema, i) => (
                      <div key={i} className="flex items-start space-x-2 text-sm">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
                          tema.voto === 'a favor' ? 'bg-emerald-400' :
                          tema.voto === 'en contra' ? 'bg-red-400' :
                          'bg-yellow-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-slate-300 block text-xs">{tema.titulo}</span>
                          <span className={`text-xs ${
                            tema.voto === 'a favor' ? 'text-emerald-400' :
                            tema.voto === 'en contra' ? 'text-red-400' :
                            'text-yellow-400'
                          }`}>
                            {tema.voto}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="chat-bubble-ai">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-slate-400 text-sm">Pensando</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-white/5 bg-dark-800/50">
        <div className="flex space-x-2 sm:space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            className="input-field flex-grow text-sm sm:text-base"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="btn-primary px-3 sm:px-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 flex-shrink-0"
          >
            <span className="hidden sm:inline">Enviar</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}

export default DigitalTwinChat
