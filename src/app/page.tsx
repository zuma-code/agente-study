"use client";

import React, { useState, useOptimistic, startTransition, useRef, useEffect } from 'react';
import { queryNotebookLM, getNotebooks, getActiveManuals, generateQuiz, syncManuals, getSyllabusProgress, toggleThemeCompletion, generateSourceSummary, generateFlashcards } from './actions';
import ReactMarkdown from 'react-markdown';
import { Message, Notebook, Note, Quiz, ExamResult, Flashcard } from './types';

const NotebookLMStudyHub = () => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [manuals, setManuals] = useState<any[]>([]);
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [selectedManualNames, setSelectedManualNames] = useState<string[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<string>("aeat-all");
  const [notes, setNotes] = useState<Note[]>([]);
  const [examHistory, setExamHistory] = useState<ExamResult[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [noteSearch, setNoteSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'library' | 'syllabus' | 'review'>('syllabus');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [activeQuizThemeId, setActiveQuizThemeId] = useState<number | undefined>(undefined);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
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
    getSyllabusProgress().then(setSyllabus);
    const savedNotes = localStorage.getItem('aeat_study_notes');
    if (savedNotes) setNotes(JSON.parse(savedNotes));
    const savedHistory = localStorage.getItem('aeat_exam_history');
    if (savedHistory) setExamHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    localStorage.setItem('aeat_study_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('aeat_exam_history', JSON.stringify(examHistory));
  }, [examHistory]);

  useEffect(() => {
    let interval: any;
    if (isTimerActive) {
      interval = setInterval(() => { setTimer((prev) => prev + 1); }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleManual = (name: string) => {
    setSelectedManualNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleToggleTheme = async (id: number) => {
    try {
      await toggleThemeCompletion(id);
      const updated = await getSyllabusProgress();
      setSyllabus(updated);
    } catch (e) {
      alert('Error al actualizar el progreso.');
    }
  };

  const addNote = (content: string, titlePrefix: string = "") => {
    const newNote: Note = {
      id: Math.random().toString(36).substring(7),
      title: titlePrefix + content.substring(0, 30) + '...',
      content: content,
      timestamp: Date.now()
    };
    setNotes(prev => [newNote, ...prev]);
    alert('Guardado en Notas 🧠');
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    let correct = 0;
    let errors = 0;
    quiz.questions.forEach((q, i) => {
      if (userAnswers[i] === q.correctAnswer) correct++;
      else if (userAnswers[i] !== undefined) errors++;
    });
    const rawScore = correct - (errors / 3);
    return Math.max(0, parseFloat(rawScore.toFixed(2)));
  };

  const saveExamResult = () => {
    if (!quiz) return;
    setIsTimerActive(false);
    const score = calculateScore();
    const result: ExamResult = {
      id: Math.random().toString(36).substring(7),
      title: `${quiz.title} (${formatTime(timer)})`,
      themeId: activeQuizThemeId,
      score: score,
      total: quiz.questions.length,
      timestamp: Date.now()
    };
    setExamHistory(prev => [result, ...prev]);
    setShowResults(true);
  };

  const handleReinforceErrors = async () => {
    if (!quiz) return;
    const failures = quiz.questions.filter((q, i) => userAnswers[i] !== q.correctAnswer);
    if (failures.length === 0) {
      alert("¡No has tenido fallos! Enhorabuena.");
      return;
    }

    const failureQueries = failures.map(f => `- ${f.question} (Respuesta correcta: ${f.options[f.correctAnswer]})`).join('\n');
    const query = `He fallado estas preguntas en mi último test. Explícame detalladamente por qué las respuestas correctas son las que son, citando la ley y dándome una regla mnemotécnica o consejo para no volver a fallar:\n${failureQueries}`;
    
    setQuiz(null);
    handleSend(query);
  };

  const getThemePerformance = (themeId: number) => {
    const results = examHistory.filter(h => h.themeId === themeId);
    if (results.length === 0) return null;
    const avg = results.reduce((acc, h) => acc + (h.score / h.total), 0) / results.length;
    if (avg >= 0.8) return '🟢';
    if (avg >= 0.5) return '🟡';
    return '🔴';
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncManuals();
      const [nbs, mans] = await Promise.all([getNotebooks(), getActiveManuals()]);
      setNotebooks(nbs);
      setManuals(mans);
    } catch (e) {
      alert('Error al sincronizar.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateQuiz = async (count: number = 5, themeId?: number) => {
    setIsGeneratingQuiz(true);
    setQuiz(null);
    setFlashcards([]);
    setShowResults(false);
    setUserAnswers({});
    setTimer(0);
    setActiveQuizThemeId(themeId);
    try {
      const data = await generateQuiz(selectedNotebook, selectedManualNames, count, themeId);
      setQuiz(data);
      setIsTimerActive(true);
    } catch (e) {
      alert('Error al generar el test.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    setIsGeneratingFlashcards(true);
    setFlashcards([]);
    setQuiz(null);
    try {
      const data = await generateFlashcards(selectedManualNames);
      setFlashcards(data.cards);
      setCurrentFlashcardIndex(0);
      setIsFlipped(false);
    } catch (e) {
      alert('Error al generar las flashcards.');
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const handleSummarizeManual = async (name: string) => {
    setIsTyping(true);
    try {
      const summary = await generateSourceSummary(name);
      setMessages(prev => [...prev, { role: 'assistant', content: `📖 **Guía de Estudio: ${name}**\n\n${summary}` }]);
    } catch (e) {
      alert('Error al generar la guía.');
    } finally {
      setIsTyping(false);
    }
  };

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(messages, (state, newMessage: Message) => [...state, newMessage]);
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [optimisticMessages, isTyping, quiz, flashcards]);

  const handleSend = async (queryToUse?: string) => {
    const query = queryToUse || input;
    if (!query.trim() || isTyping) return;
    const userMessage: Message = { role: 'user', content: query };
    if (!queryToUse) setInput('');
    setIsTyping(true);
    startTransition(() => addOptimisticMessage(userMessage));
    try {
      const response = await queryNotebookLM(query, selectedNotebook, selectedManualNames);
      setMessages(prev => [...prev.filter(m => !m.content.includes('❌')), userMessage, response]);
    } catch (error: any) {
      setMessages(prev => [...prev, userMessage, { role: 'assistant', content: `❌ **Error:** ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const progress = Math.round((syllabus.filter(t => t.completed).length / (syllabus.length || 1)) * 100);
  const filteredNotes = notes.filter(n => n.content.toLowerCase().includes(noteSearch.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans flex flex-col">
      <header className="max-w-6xl mx-auto w-full flex justify-between items-center mb-12 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl">A</div>
          <div><h1 className="text-xl font-bold">Agente AEAT</h1><p className="text-[10px] text-slate-500 uppercase tracking-widest">Inteligencia de Estudio</p></div>
        </div>
        <div className="flex gap-3">
          {quiz && <div className="px-4 py-2 bg-blue-600/20 border border-blue-500/50 rounded-xl text-blue-400 font-mono text-sm flex items-center gap-2">{formatTime(timer)}</div>}
          <div className="px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-full text-[10px] flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>Motor 2.0 Activo</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow overflow-hidden">
        <aside className="lg:col-span-3 flex flex-col gap-4 overflow-hidden">
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {[{ id: 'library', label: 'Libros', icon: '📚' }, { id: 'syllabus', label: 'Temas', icon: '📑' }, { id: 'review', label: 'Repaso', icon: '🧠' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-grow py-2 text-[9px] font-bold rounded-lg transition-all flex flex-col items-center ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                <span className="text-sm mb-1">{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar">
            {activeTab === 'library' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-2xl">
                  <h3 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Cuadernos</h3>
                  <div className="space-y-2">
                    {notebooks.map((nb) => (
                      <div key={nb.id} className={`p-3 rounded-xl border transition-all ${selectedNotebook === nb.id ? 'bg-blue-600/10 border-blue-500/40 text-blue-100' : 'bg-slate-900/50 border-slate-800 text-slate-400'}`}>
                        <div className="font-bold text-[11px]">{nb.name}</div><div className="text-[9px] mt-1 opacity-60">{nb.fileCount} PDFs</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-2xl">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documentos</h3>
                    <button onClick={handleSync} disabled={isSyncing} className="text-[8px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30">{isSyncing ? '...' : 'Sync'}</button>
                  </div>
                  <ul className="space-y-2">
                    {manuals.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 group/man">
                        <input type="checkbox" checked={selectedManualNames.includes(m.displayName)} onChange={() => toggleManual(m.displayName)} className="mt-1 w-3 h-3 rounded border-slate-700 bg-slate-900 text-blue-600" />
                        <div className="flex-grow"><span className={`text-[10px] leading-tight break-all transition-colors ${selectedManualNames.includes(m.displayName) ? 'text-blue-300' : 'text-slate-500'}`}>{m.displayName}</span></div>
                        <button onClick={() => handleSummarizeManual(m.displayName)} className="opacity-0 group-hover/man:opacity-100 text-[8px] bg-slate-800 text-blue-400 px-1.5 py-0.5 rounded border border-slate-700 hover:bg-slate-700">Guía</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'syllabus' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl">
                  <h3 className="text-[10px] font-bold text-slate-400 mb-3 uppercase flex justify-between">Progreso <span className="text-blue-400">{progress}%</span></h3>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mb-5"><div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${progress}%` }}></div></div>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                    {syllabus.map((theme) => (
                      <div key={theme.id} className="flex items-center gap-2 group">
                        <button onClick={() => handleToggleTheme(theme.id)} className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${theme.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700 hover:border-slate-500'}`}>{theme.completed && <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg>}</button>
                        <span onClick={() => handleSend(`Explícame el Tema ${theme.id}: ${theme.title}. Referencias: ${theme.refs}`)} className={`text-[10px] leading-tight flex-grow cursor-pointer hover:text-blue-300 transition-colors ${theme.completed ? 'text-slate-400' : 'text-slate-600'}`}>T{theme.id}: {theme.title}</span>
                        <span className="text-[10px] mr-1">{getThemePerformance(theme.id)}</span>
                        <button onClick={() => handleGenerateQuiz(5, theme.id)} className="opacity-0 group-hover:opacity-100 p-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/40 transition-all"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleGenerateQuiz(10)} disabled={isGeneratingQuiz} className="py-4 bg-emerald-600/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-[10px] font-bold hover:bg-emerald-600/20 transition-all flex flex-col items-center justify-center gap-1">Test 10 Pregs</button>
                  <button onClick={() => handleGenerateQuiz(20)} disabled={isGeneratingQuiz} className="py-4 bg-red-600/10 border border-red-500/30 rounded-2xl text-red-400 text-[10px] font-bold hover:bg-red-600/20 transition-all flex flex-col items-center justify-center gap-1">SIMULACRO 20</button>
                </div>
                <button onClick={handleGenerateFlashcards} disabled={isGeneratingFlashcards} className="w-full py-4 bg-purple-600/10 border border-purple-500/30 rounded-2xl text-purple-400 text-[10px] font-bold hover:bg-purple-600/20 transition-all flex items-center justify-center gap-2">Tarjetas</button>
              </div>
            )}

            {activeTab === 'review' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-2xl">
                  <h3 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Tendencia de Notas</h3>
                  <div className="h-16 flex items-end gap-1 px-2">
                    {examHistory.slice(0, 10).reverse().map((h, i) => (
                      <div key={i} className={`flex-grow rounded-t ${h.score >= h.total/2 ? 'bg-emerald-500/40' : 'bg-red-500/40'}`} style={{ height: `${(h.score/h.total)*100}%` }} title={`Nota: ${h.score}/${h.total}`}></div>
                    ))}
                    {examHistory.length === 0 && <div className="w-full text-center text-[10px] text-slate-600 italic">Haz tu primer examen para ver la tendencia.</div>}
                  </div>
                </div>
                <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-center mb-4"><h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notas ({notes.length})</h3><button onClick={exportNotes} className="p-1 hover:bg-slate-800 rounded transition-colors text-blue-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></button></div>
                  <input type="text" placeholder="Buscar en notas..." value={noteSearch} onChange={(e) => setNoteSearch(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] text-slate-300 mb-4" />
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredNotes.map(note => (
                      <div key={note.id} className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 group relative">
                        <button onClick={() => deleteNote(note.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg></button>
                        <div className="text-[10px] text-slate-300 leading-relaxed"><ReactMarkdown>{note.content.substring(0, 150) + '...'}</ReactMarkdown></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        <section className="lg:col-span-9 flex flex-col gap-6 overflow-hidden">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 flex-grow flex flex-col shadow-2xl relative overflow-hidden h-[600px]">
            <div className="flex-grow overflow-y-auto space-y-6 mb-8 pr-2 custom-scrollbar">
              {!quiz && flashcards.length === 0 && optimisticMessages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${msg.role === 'user' ? 'bg-slate-700' : 'bg-blue-600'}`}>{msg.role === 'user' ? 'U' : 'A'}</div>
                  <div className={`p-4 rounded-2xl max-w-[85%] border relative group/msg ${msg.role === 'user' ? 'bg-blue-600/10 border-blue-500/20' : 'bg-slate-800/80 border-slate-700'}`}>
                    {msg.role === 'assistant' && <button onClick={() => addNote(msg.content)} className="absolute -right-10 top-0 p-2 text-slate-600 hover:text-blue-400 opacity-0 group-hover/msg:opacity-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg></button>}
                    <div className="text-sm prose prose-invert prose-p:leading-relaxed prose-sm"><ReactMarkdown components={{ a: ({...p}) => <span className="inline-block bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded text-[10px] font-bold cursor-help mx-0.5" title={msg.citations?.find(c => c.index === p.children?.toString())?.snippet}>{p.children}</span> }}>{msg.content}</ReactMarkdown></div>
                    {msg.role === 'assistant' && msg.suggestions && (<div className="mt-4 flex flex-wrap gap-2">{msg.suggestions.map((s, si) => <button key={si} onClick={() => handleSend(s)} className="text-[10px] bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1.5 rounded-full transition-all">{s}</button>)}</div>)}
                  </div>
                </div>
              ))}

              {flashcards.length > 0 && (
                <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in zoom-in duration-300">
                  <div className="text-slate-400 text-xs font-mono">TARJETA {currentFlashcardIndex + 1} DE {flashcards.length}</div>
                  <div onClick={() => setIsFlipped(!isFlipped)} className="w-full max-w-md aspect-[3/2] cursor-pointer perspective-1000 group">
                    <div className={`relative w-full h-full transition-all duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                      <div className="absolute w-full h-full backface-hidden bg-slate-800 border-2 border-blue-500/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
                        <div className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-4">Pregunta</div>
                        <p className="text-lg font-bold leading-relaxed">{flashcards[currentFlashcardIndex].front}</p>
                      </div>
                      <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-slate-900 border-2 border-emerald-500/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl relative">
                        <div className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-4">Respuesta</div>
                        <div className="text-sm text-slate-200 leading-relaxed overflow-y-auto custom-scrollbar max-h-full"><ReactMarkdown>{flashcards[currentFlashcardIndex].back}</ReactMarkdown></div>
                        <button onClick={(e) => { e.stopPropagation(); addNote(flashcards[currentFlashcardIndex].back, "Flashcard: "); }} className="absolute bottom-4 right-4 text-slate-600 hover:text-blue-400 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg></button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => { if (currentFlashcardIndex > 0) { setCurrentFlashcardIndex(prev => prev - 1); setIsFlipped(false); }}} disabled={currentFlashcardIndex === 0} className="px-6 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs hover:bg-slate-800 disabled:opacity-30">Anterior</button>
                    <button onClick={() => { if (currentFlashcardIndex < flashcards.length - 1) { setCurrentFlashcardIndex(prev => prev + 1); setIsFlipped(false); } else { setFlashcards([]); }}} className="px-8 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white">Siguiente</button>
                  </div>
                </div>
              )}

              {quiz && (
                <div className="bg-slate-800/90 border border-blue-500/40 rounded-3xl p-8 my-6 animate-in zoom-in duration-300 shadow-2xl overflow-y-auto custom-scrollbar max-h-full relative">
                  <div className="absolute top-8 right-8 flex flex-col items-end">
                    <h2 className="text-xl font-bold text-blue-300">🎯 {quiz.title}</h2>
                    {showResults && <div className="mt-2 text-2xl font-black text-emerald-400">NOTA: {calculateScore()}</div>}
                  </div>
                  <div className="space-y-10 mt-12">
                    {quiz.questions.map((q, qi) => (
                      <div key={qi} className="space-y-4">
                        <p className="text-sm font-bold text-slate-200">{qi + 1}. {q.question}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {q.options.map((opt, oi) => (
                            <button key={oi} disabled={showResults} onClick={() => setUserAnswers(prev => ({ ...prev, [qi]: oi }))} className={`text-left p-4 rounded-xl text-xs transition-all border ${userAnswers[qi] === oi ? 'bg-blue-600/30 border-blue-400 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800'} ${showResults && oi === q.correctAnswer ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : ''} ${showResults && userAnswers[qi] === oi && oi !== q.correctAnswer ? 'bg-red-500/20 border-red-500 text-red-300' : ''}`}>{opt}</button>
                          ))}
                        </div>
                        {showResults && <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 mt-2 text-[10px] text-slate-400 leading-relaxed italic border-l-4 border-l-blue-500 relative group/expl">{q.explanation}<button onClick={() => addNote(q.explanation, "Pregunta Test: ")} className="absolute top-2 right-2 opacity-0 group-hover/expl:opacity-100 text-slate-600 hover:text-blue-400 transition-all"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg></button></div>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-10 flex justify-end gap-4">
                    {!showResults ? (
                      <button onClick={saveExamResult} disabled={Object.keys(userAnswers).length < quiz.questions.length} className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold text-sm transition-all text-white">Finalizar</button>
                    ) : (
                      <>
                        <button onClick={handleReinforceErrors} className="bg-amber-600 hover:bg-amber-500 px-8 py-3 rounded-xl font-bold text-sm transition-all text-white flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                          Reforzar Fallos
                        </button>
                        <button onClick={() => setQuiz(null)} className="bg-slate-700 hover:bg-slate-600 px-8 py-3 rounded-xl font-bold text-sm transition-all">Cerrar</button>
                      </>
                    )}
                  </div>
                </div>
              )}
              {isTyping && <div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-[10px] font-bold animate-pulse text-white">A</div><div className="bg-slate-800/80 p-4 rounded-2xl rounded-tl-none border border-slate-700"><div className="flex gap-1"><span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span><span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span></div></div></div>}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative group flex-shrink-0"><input type="text" disabled={isTyping} placeholder={isTyping ? "..." : "Duda o tema..."} value={input} onChange={(e) => setInput(e.target.value)} className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white" /><button type="submit" disabled={isTyping || !input.trim()} className="absolute right-3 top-3 bottom-3 bg-blue-600 hover:bg-blue-500 px-6 rounded-xl font-bold text-xs transition-all text-white">Enviar</button></form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default NotebookLMStudyHub;
