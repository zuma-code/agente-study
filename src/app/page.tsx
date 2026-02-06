"use client";

import React, { useState, useOptimistic, startTransition, useRef, useEffect } from 'react';
import { queryNotebookLM, getNotebooks, getActiveManuals } from './actions';
import ReactMarkdown from 'react-markdown';
import { Message, Notebook } from './types';

const NotebookLMStudyHub = () => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [manuals, setManuals] = useState<any[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<string>("aeat-all");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '¡Hola! Bienvenido a tu entorno de estudio personalizado. He cargado tus manuales. ¿En qué cuaderno quieres trabajar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getNotebooks().then(setNotebooks);
    getActiveManuals().then(setManuals);
  }, []);

  // Next.js 16/React 19 Optimistic UI
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage: Message) => [...state, newMessage]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [optimisticMessages, isTyping]);

  const handleSend = async (queryToUse?: string) => {
    const query = queryToUse || input;
    if (!query.trim() || isTyping) return;

    const userMessage: Message = { role: 'user', content: query };
    if (!queryToUse) setInput('');
    setLastQuery(query);
    setIsTyping(true);

    startTransition(() => {
      // Add to optimistic state immediately
      addOptimisticMessage(userMessage);
    });

    try {
      const response = await queryNotebookLM(query, selectedNotebook);
      // Update real state after server response
      setMessages(prev => [
        ...prev.filter(m => m.content !== 'Hubo un error al procesar tu solicitud.' && !m.content.includes('timeout')), 
        userMessage, 
        {
          role: 'assistant',
          content: response.content,
          sources: response.sources,
          citations: response.citations,
          suggestions: response.suggestions
        }
      ]);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Hubo un error al procesar tu solicitud.';
      setMessages(prev => [...prev, userMessage, {
        role: 'assistant', // Keeping as assistant for UI consistency but with error content
        content: `❌ **Error:** ${errorMessage}`
      }]);
    } finally {
      setIsTyping(false);
    }
  };
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      {/* Header */}
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-900/20">
            A
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agente AEAT</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">NotebookLM Edition</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-full text-xs flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            NotebookLM Conectado
          </div>
          <div className="px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-full text-xs">
            Examen: <span className="text-blue-400 font-bold">8 Mar 2026</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Syllabus Status */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/30 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Tus Cuadernos</h3>
            <div className="space-y-3">
              {notebooks.map((nb) => (
                <button
                  key={nb.id}
                  onClick={() => setSelectedNotebook(nb.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedNotebook === nb.id 
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-100 shadow-lg shadow-blue-900/20' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs mb-1">{nb.name}</div>
                  <div className="text-[10px] opacity-60 leading-tight">{nb.description}</div>
                  <div className="text-[9px] mt-2 font-mono text-blue-400 uppercase tracking-tighter">
                    {nb.fileCount} documentos indexados
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/30 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Documentos Activos</h3>
            <ul className="space-y-3">
              {manuals.length > 0 ? manuals.map((m, i) => (
                <li key={i} className="flex items-start gap-3 text-[10px] leading-tight text-slate-400">
                  <div className="w-4 h-4 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500 mt-0.5">PDF</div>
                  {m.displayName}
                </li>
              )) : (
                <li className="text-xs text-slate-600 italic">No hay manuales cargados</li>
              )}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-blue-900/20 to-transparent border border-blue-900/30 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-blue-300 mb-2">Sugerencia de hoy</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              "Pregúntame sobre las diferencias entre el Impuesto de Sociedades y el IRPF en retenciones."
            </p>
          </div>
        </aside>

        {/* Main Content: Chat Interface */}
        <section className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 h-[600px] flex flex-col shadow-2xl relative overflow-hidden">
            {/* Gloss Highlight */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="flex-grow overflow-y-auto space-y-6 mb-8 pr-2 custom-scrollbar">
              {optimisticMessages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${msg.role === 'user' ? 'bg-slate-700' : 'bg-blue-600'}`}>
                    {msg.role === 'user' ? 'U' : 'A'}
                  </div>
                  <div className={`p-4 rounded-2xl max-w-[80%] border ${msg.role === 'user'
                    ? 'bg-blue-600/20 border-blue-500/30 rounded-tr-none'
                    : 'bg-slate-800/80 border-slate-700 rounded-tl-none'
                    }`}>
                    <div className="text-sm leading-relaxed prose prose-invert prose-p:leading-relaxed prose-pre:bg-slate-900">
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown
                          components={{
                            a: ({ ...props }) => {
                              const citation = msg.citations?.find(c => c.index === props.children?.toString());
                              return (
                                <span 
                                  className="inline-block bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-bold cursor-help mx-0.5 border border-blue-500/30 hover:bg-blue-500/40 transition-colors" 
                                  title={citation?.snippet || citation?.sourceName}
                                >
                                  {props.children}
                                </span>
                              );
                            }
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>

                    {/* Suggestions */}
                    {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {msg.suggestions.map((suggestion, si) => (
                          <button
                            key={si}
                            onClick={() => handleSend(suggestion)}
                            className="text-[10px] bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-full transition-all text-left"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                    {msg.content.includes('❌ **Error:**') && (
                      <button 
                        onClick={() => handleSend(lastQuery)}
                        className="mt-3 text-xs bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        Reintentar consulta
                      </button>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Fuentes Consultadas</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((source, si) => (
                            <span key={si} className="text-[10px] bg-slate-900/50 px-2 py-1 rounded border border-slate-800 text-slate-400">
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-xs font-bold animate-pulse">A</div>
                  <div className="bg-slate-800/80 p-4 rounded-2xl rounded-tl-none border border-slate-700">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative group"
            >
              <input
                type="text"
                disabled={isTyping}
                placeholder={isTyping ? "Agente pensando..." : "Escribe tu duda aquí..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl px-6 py-5 pr-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xl disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isTyping || !input.trim()}
                className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 px-8 rounded-xl font-bold text-sm transition-all flex items-center gap-2 disabled:bg-slate-800 disabled:text-slate-500"
              >
                {isTyping ? '...' : 'Enviar'}
                {!isTyping && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>}
              </button>
            </form>
            <p className="text-[10px] text-center text-slate-600 mt-4 uppercase tracking-[0.2em]">
              Powered by Google NotebookLM MCP
            </p>
          </div>
        </section>
      </main>

    </div>
  );
};

export default NotebookLMStudyHub;
