import React, { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, Loader2, Save, FileText, Printer, Sparkles, Activity, ChevronLeft } from "lucide-react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { User } from "firebase/auth";
import { Note, AppSettings, TranscriptionResponse } from "../types";
import { formatAllExams } from "../utils";

interface NotesViewProps {
  currentUser: User | null;
  settings: AppSettings;
  corrections?: Record<string, string>;
}

const NOTE_TEMPLATE = `== Identificação ==


== Queixa Principal ==


== HMA ==


== Exame físico ==


== Exames complementares ==


== Condutas ==
`;

export default function NotesView({ currentUser, settings, corrections = {} }: NotesViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const sortedGroups = useMemo(() => {
    const groups: Record<string, Record<string, Note[]>> = {};
    
    notes.forEach((note) => {
      const ward = (note.ward || "").trim() || "Sem Enfermaria";
      const room = (note.room || "").trim() || "Sem Quarto";
      
      if (!groups[ward]) {
        groups[ward] = {};
      }
      if (!groups[ward][room]) {
        groups[ward][room] = [];
      }
      groups[ward][room].push(note);
    });
    
    // Sort wards: alphabetical, but "Sem Enfermaria" goes last
    const sortedWards = Object.keys(groups).sort((a, b) => {
      if (a === "Sem Enfermaria") return 1;
      if (b === "Sem Enfermaria") return -1;
      return a.localeCompare(b, "pt-BR", { numeric: true });
    });
    
    return sortedWards.map(ward => {
      // Sort rooms within each ward: alphabetical, but "Sem Quarto" goes last
      const sortedRooms = Object.keys(groups[ward]).sort((a, b) => {
        if (a === "Sem Quarto") return 1;
        if (b === "Sem Quarto") return -1;
        return a.localeCompare(b, "pt-BR", { numeric: true });
      });
      
      return {
        ward,
        rooms: sortedRooms.map(room => ({
          room,
          notes: groups[ward][room]
        }))
      };
    });
  }, [notes]);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [ward, setWard] = useState("");
  const [room, setRoom] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Mobile View Toggle and Ward Autocomplete
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [showWardDropdown, setShowWardDropdown] = useState(false);
  const wardDropdownRef = useRef<HTMLDivElement>(null);

  const existingWards = useMemo(() => {
    const wardsSet = new Set<string>();
    notes.forEach((note) => {
      if (note.ward?.trim()) {
        wardsSet.add(note.ward.trim());
      }
    });
    return Array.from(wardsSet).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [notes]);

  const filteredWards = useMemo(() => {
    const currentTyped = ward.trim().toLowerCase();
    if (!currentTyped) return existingWards;
    return existingWards.filter(w => w.toLowerCase().includes(currentTyped));
  }, [existingWards, ward]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wardDropdownRef.current && !wardDropdownRef.current.contains(event.target as Node)) {
        setShowWardDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Transcription states
  const [pastedExamText, setPastedExamText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir Admissão - ${title}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 20px; color: #333; line-height: 1.6; }
              h1 { font-size: 24px; margin-bottom: 5px; }
              .date { font-size: 12px; color: #777; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 15px; }
              .content { font-size: 14px; white-space: pre-wrap; font-family: 'JetBrains Mono', monospace; }
              @media print {
                body { margin: 0; padding: 15mm; }
              }
            </style>
          </head>
          <body>
            <h1>${title || "Admissão Médica"}</h1>
            <div class="date">Registrado em: ${new Date().toLocaleString('pt-BR')}</div>
            <div class="content">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            <script>
              window.onload = () => { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleTranscribeExams = async () => {
    if (!pastedExamText.trim()) return;
    if (!settings.geminiApiKey?.trim()) {
      setTranscriptionError("Por favor, configure sua Chave de API do Gemini nas configurações do aplicativo primeiro.");
      return;
    }

    setIsAnalyzing(true);
    setTranscriptionError(null);
    setAnalysisProgress("Processando análise de exames na nuvem...");

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Gemini-Key": settings.geminiApiKey || ""
        },
        body: JSON.stringify({ text: pastedExamText }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Erro de rede ao analisar o exame.");
      }

      const rawData: TranscriptionResponse = await response.json();
      
      if (!rawData.exams || rawData.exams.length === 0) {
        throw new Error("Nenhum exame reconhecido.");
      }

      // Apply Corrections
      const data = {
        ...rawData,
        exams: rawData.exams.map(exam => ({
          ...exam,
          findings: exam.findings.map(finding => {
            const original = finding.label;
            const shorthand = corrections[original];
            return {
              ...finding,
              label: shorthand || finding.label,
              subItems: finding.subItems?.map(sub => ({
                ...sub,
                label: corrections[sub.label] || sub.label
              }))
            };
          })
        }))
      };

      const formatted = formatAllExams(data, settings);
      
      // Append formatted results to content
      setContent((prev) => prev + (prev.trim() ? "\n\n" : "") + "=== RESULTADOS DE EXAMES ===\n" + formatted + "\n===========================\n");
      setPastedExamText(""); // clear input

    } catch (err: any) {
      console.error(err);
      setTranscriptionError(err.message || "Houve uma falha ao contatar a IA.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress("");
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const notesRef = collection(db, "users", currentUser.uid, "notes");
    const q = query(notesRef, orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData: Note[] = [];
      snapshot.forEach((doc) => {
        notesData.push({ id: doc.id, ...doc.data() } as Note);
      });
      setNotes(notesData);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/notes`);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (selectedNoteId) {
      const note = notes.find(n => n.id === selectedNoteId);
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        setWard(note.ward || "");
        setRoom(note.room || "");
      }
    } else {
      setTitle("");
      setContent("");
      setWard("");
      setRoom("");
    }
  }, [selectedNoteId, notes]);

  const handleCreateNew = () => {
    setSelectedNoteId(null);
    setTitle("");
    setContent("");
    setWard("");
    setRoom("");
    setViewMode('editor');
  };

  const handleSave = async () => {
    if (!currentUser || !title.trim()) return;

    setIsSaving(true);
    const id = selectedNoteId || crypto.randomUUID();
    const noteData = {
      title,
      content,
      ward: ward.trim(),
      room: room.trim(),
      timestamp: selectedNoteId ? (notes.find(n => n.id === id)?.timestamp || new Date().toISOString()) : new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "users", currentUser.uid, "notes", id), noteData);
      setSelectedNoteId(id);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/notes/${id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const confirmDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "notes", id));
      if (selectedNoteId === id) {
        handleCreateNew();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/notes/${id}`);
    } finally {
      setNoteToDelete(null);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteToDelete(id);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteToDelete(null);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-160px)]">
      {/* Sidebar List */}
      <div className={`w-full md:w-80 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden shrink-0 ${viewMode === 'editor' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center">
            <FileText className="w-4 h-4 mr-2 text-indigo-500" />
            Admissões
          </h3>
          <button
            onClick={handleCreateNew}
            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
            title="Nova Admissão"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center p-6 space-y-2">
              <p className="text-xs text-slate-500">Nenhuma admissão cadastrada.</p>
              <button 
                onClick={handleCreateNew}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Criar a primeira
              </button>
            </div>
          ) : (
            <div className="space-y-4 p-1">
              {sortedGroups.map((wardGroup) => (
                <div key={wardGroup.ward} className="space-y-2">
                  {/* Ward Header */}
                  <div className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center shadow-xs">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Enfermaria: {wardGroup.ward}
                    </span>
                  </div>
                  
                  {/* Rooms within Ward */}
                  <div className="space-y-3 pl-1 mb-1">
                    {wardGroup.rooms.map((roomGroup) => (
                      <div key={roomGroup.room} className="space-y-2 border-l border-slate-200/60 pl-2">
                        {/* Room Subtitle */}
                        <div className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider pl-1 flex items-center gap-1">
                          <span>Quarto: {roomGroup.room}</span>
                        </div>
                        
                        {/* Notes list within this room */}
                        <div className="space-y-1.5">
                          {roomGroup.notes.map((note) => (
                            <div
                              key={note.id}
                              onClick={() => {
                                setSelectedNoteId(note.id);
                                setViewMode('editor');
                              }}
                              className={`p-2.5 rounded-xl cursor-pointer transition-all border flex flex-col gap-1 group/item ${
                                selectedNoteId === note.id 
                                  ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                                  : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <h4 className={`text-xs font-semibold pr-3 truncate ${
                                  selectedNoteId === note.id ? "text-indigo-900" : "text-slate-750"
                                }`}>
                                  {note.title || "Sem título"}
                                </h4>
                                {noteToDelete === note.id ? (
                                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={(e) => confirmDelete(note.id, e)}
                                      className="text-[9px] font-bold text-white bg-rose-500 hover:bg-rose-600 px-1.5 py-0.5 rounded transition-colors"
                                    >
                                      Sim
                                    </button>
                                    <button
                                      onClick={cancelDelete}
                                      className="text-[9px] font-bold text-slate-500 bg-slate-200 hover:bg-slate-300 px-1.5 py-0.5 rounded transition-colors"
                                    >
                                      Não
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => handleDeleteClick(note.id, e)}
                                    className="text-slate-400 hover:text-rose-500 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity p-1.5 bg-slate-50 hover:bg-slate-100 md:bg-transparent md:hover:bg-transparent rounded-lg shrink-0 animate-fade-in"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              
                              {/* Location Tags on Note Card */}
                              {(note.ward || note.room) && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {note.ward && (
                                    <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200/80">
                                      Enf: {note.ward}
                                    </span>
                                  )}
                                  {note.room && (
                                    <span className="text-[9px] font-bold bg-indigo-50/70 text-indigo-600 px-1.5 py-0.2 rounded border border-indigo-150">
                                      Leito: {note.room}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                {new Date(note.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Editor Area */}
      <div className={`flex-1 flex gap-4 h-full ${viewMode === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {/* Main Note Editor */}
        <div className="flex-[2] bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden relative">
          <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="md:hidden mr-2 p-1.5 hover:bg-slate-200 rounded-lg text-slate-650 flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-xs transition-colors"
                title="Voltar para lista"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do Paciente / Admissão..."
                className="flex-1 bg-transparent font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 text-sm"
              />
            </div>
 
            {/* Location tags inputs row */}
            <div className="flex flex-wrap items-center gap-4 text-xs pt-2 border-t border-slate-200/60">
              <div className="flex items-center space-x-1.5 relative" ref={wardDropdownRef}>
                <span className="text-slate-500 font-semibold tracking-wide uppercase text-[9px]">Enfermaria (Ala):</span>
                <div className="relative">
                  <input
                    type="text"
                    value={ward}
                    onFocus={() => setShowWardDropdown(true)}
                    onChange={(e) => {
                      setWard(e.target.value);
                      setShowWardDropdown(true);
                    }}
                    placeholder="Ex: Ala Norte, Enf 3"
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded px-2 py-0.5 text-slate-800 focus:outline-none focus:border-indigo-500 w-36 font-semibold text-xs transition-colors"
                  />
                  {showWardDropdown && filteredWards.length > 0 && (
                    <div className="absolute left-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto custom-scrollbar">
                      <div className="p-2 text-[9px] font-bold text-slate-400 bg-slate-50/80 uppercase tracking-widest sticky top-0 border-b border-slate-100">
                        Enfermarias Ativas
                      </div>
                      <div className="p-1 space-y-0.5">
                        {filteredWards.map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => {
                              setWard(w);
                              setShowWardDropdown(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors font-medium rounded-lg flex items-center justify-between"
                          >
                            <span>{w}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-100/80 px-1.5 py-0.5 rounded font-bold font-mono">
                              {notes.filter(n => n.ward?.trim() === w).length}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 font-semibold tracking-wide uppercase text-[9px]">Quarto (Leito):</span>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Ex: Quarto 104"
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded px-2 py-0.5 text-slate-800 focus:outline-none focus:border-indigo-500 w-36 font-semibold text-xs transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="flex-1 relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva as anotações clínicas da admissão aqui... Os exames transcritos aparecerão aqui."
              className="absolute inset-0 w-full h-full p-6 text-sm resize-none focus:outline-none text-slate-700 leading-relaxed custom-scrollbar font-mono"
            />
          </div>
          <div className="p-3.5 border-t border-slate-100 bg-slate-50/80 backdrop-blur-xs flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider ml-1">
              {content.length} caracteres
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center shadow-xs transition-all bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 active:scale-95"
                title="Imprimir"
              >
                <Printer className="w-4 h-4 mr-1.5 text-indigo-500" />
                Imprimir
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim() || isSaving}
                className={`py-2 px-4.5 rounded-xl text-xs font-bold flex items-center shadow-sm transition-all ${
                  !title.trim()
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-[0_2px_8px_rgba(79,70,229,0.15)]"
                }`}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1.5" />
                )}
                Salvar
              </button>
            </div>
          </div>
        </div>

        {/* Lab Transcription Tool */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden max-w-[320px] lg:max-w-md hidden md:flex">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-slate-800 text-xs">Transcrever Exames p/ Nota</h3>
          </div>
          <div className="flex-1 p-4 flex flex-col relative space-y-3">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Cole o conteúdo bruto do PDF do laboratório aqui. A IA irá formatar e jogar automaticamente para o texto principal à esquerda.
            </p>
            <textarea
              value={pastedExamText}
              onChange={(e) => setPastedExamText(e.target.value)}
              placeholder="Cole os exames de sangue e urina bagunçados aqui..."
              className="w-full flex-1 p-3 text-xs font-mono bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent custom-scrollbar resize-none"
            />
            {transcriptionError && (
              <div className="p-2 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-[10px]">
                {transcriptionError}
              </div>
            )}
            <button
              onClick={handleTranscribeExams}
              disabled={isAnalyzing || !pastedExamText.trim()}
              className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
                isAnalyzing || !pastedExamText.trim()
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>{analysisProgress || "Processando..."}</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-1.5" />
                  <span>Extrair com IA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Hidden layout for print snapshot */}
      <div className="hidden">
        <div ref={printRef} />
      </div>
    </div>
  );
}
