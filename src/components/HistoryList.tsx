import { useState } from "react";
import { HistoryItem } from "../types";
import { History, Search, Trash2, Calendar, Clipboard, Check, RefreshCw, User } from "lucide-react";

interface HistoryListProps {
  history: HistoryItem[];
  theme?: string;
  onLoadItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export default function HistoryList({
  history,
  theme = "light",
  onLoadItem,
  onDeleteItem,
  onClearAll,
}: HistoryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isDark = theme === "dark-emerald" || theme === "midnight";
  
  const themeStyles = {
    light: {
      accentText: "text-blue-600",
      accentBg: "bg-blue-50/70",
      accentBorder: "border-blue-105",
      ring: "focus:ring-blue-550 focus:border-blue-550",
      badge: "bg-blue-50 text-blue-700 border-blue-150",
      card: "bg-white border-slate-200/80 shadow-sm",
      item: "bg-slate-50/40 border-slate-100",
      text: "text-slate-800",
      subText: "text-slate-500",
    },
    hospital: {
      accentText: "text-teal-600",
      accentBg: "bg-teal-50/70",
      accentBorder: "border-teal-105",
      ring: "focus:ring-teal-550 focus:border-teal-550",
      badge: "bg-teal-50 text-teal-700 border-teal-150",
      card: "bg-white border-slate-200/80 shadow-sm",
      item: "bg-slate-50/40 border-slate-100",
      text: "text-slate-800",
      subText: "text-slate-500",
    },
    emerald: {
      accentText: "text-emerald-600",
      accentBg: "bg-emerald-50/70",
      accentBorder: "border-emerald-105",
      ring: "focus:ring-emerald-550 focus:border-emerald-550",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-150",
      card: "bg-white border-slate-200/80 shadow-sm",
      item: "bg-slate-50/40 border-slate-100",
      text: "text-slate-800",
      subText: "text-slate-500",
    },
    charcoal: {
      accentText: "text-slate-800",
      accentBg: "bg-slate-100",
      accentBorder: "border-slate-300",
      ring: "focus:ring-slate-700 focus:border-slate-700",
      badge: "bg-slate-100 text-slate-800 border-slate-200",
      card: "bg-white border-slate-200/80 shadow-sm",
      item: "bg-slate-50/40 border-slate-100",
      text: "text-slate-800",
      subText: "text-slate-500",
    },
    "dark-emerald": {
      accentText: "text-emerald-400",
      accentBg: "bg-emerald-950/40",
      accentBorder: "border-emerald-900/50",
      ring: "focus:ring-emerald-500 focus:border-emerald-500",
      badge: "bg-emerald-950/60 text-emerald-400 border-emerald-900/50",
      card: "bg-slate-900 border-slate-800 shadow-xl shadow-black/20",
      item: "bg-slate-950/40 border-slate-800",
      text: "text-slate-100",
      subText: "text-slate-400",
    },
    midnight: {
      accentText: "text-sky-400",
      accentBg: "bg-sky-950/40",
      accentBorder: "border-sky-900/50",
      ring: "focus:ring-sky-500 focus:border-sky-500",
      badge: "bg-sky-950/60 text-sky-400 border-sky-900/50",
      card: "bg-slate-950 border-slate-900 shadow-xl shadow-black/20",
      item: "bg-black/60 border-slate-900",
      text: "text-slate-200",
      subText: "text-slate-400",
    },
  }[theme] || {
    accentText: "text-blue-600",
    accentBg: "bg-blue-50/70",
    accentBorder: "border-blue-105",
    ring: "focus:ring-blue-550 focus:border-blue-550",
    badge: "bg-blue-50 text-blue-700 border-blue-150",
    card: "bg-white border-slate-200/80 shadow-sm",
    item: "bg-slate-50/40 border-slate-100",
    text: "text-slate-800",
    subText: "text-slate-500",
  };

  const filteredHistory = history.filter((item) =>
    item.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatDateString = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className={`${themeStyles.card} rounded-2xl p-6 transition-all duration-300`}>
      {/* Header of history section */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${isDark ? "border-slate-800" : "border-slate-100"} pb-4 mb-4`}>
        <div className="flex items-center space-x-2.5">
          <div className={`p-2 ${themeStyles.accentBg} rounded-lg ${themeStyles.accentText} border ${themeStyles.accentBorder}`}>
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className={`font-sans font-semibold ${themeStyles.text} text-sm`}>
              Histórico de Prontuários Analisados
            </h2>
            <p className={`text-xs ${themeStyles.subText}`}>
              Registros arquivados neste navegador para acesso rápido
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            id="btn-clear-history-all"
            onClick={() => {
              if (window.confirm("Deseja realmente esvaziar todo o histórico local?")) {
                onClearAll();
              }
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline text-left cursor-pointer transition-colors"
          >
            Limpar Todo Histórico
          </button>
        )}
      </div>

      {/* Main interaction elements */}
      {history.length === 0 ? (
        <div className={`py-12 text-center ${themeStyles.subText} max-w-sm mx-auto`}>
          <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <h3 className={`font-semibold ${themeStyles.text} text-sm mb-1`}>Nenhum exame arquivado</h3>
          <p className="text-xs leading-relaxed opacity-70">
            Após analisar seus exames e obter a formatação correta, clique em "Arquivar e Atualizar no Histórico" para criar registros de segurança rápidos nesta seção.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search bar inside history */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-history"
              type="text"
              placeholder="Buscar pelo nome do paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 ${themeStyles.ring} text-xs font-medium ${isDark ? "bg-slate-950 border-slate-900 text-slate-100 focus:bg-black" : "bg-slate-50 border-slate-200 focus:bg-white"}`}
            />
          </div>

          {filteredHistory.length === 0 ? (
            <div className={`py-6 text-center ${themeStyles.subText} text-xs`}>
              Nenhum paciente encontrado para a busca "{searchTerm}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHistory.map((item) => {
                const totalExams = item.parsedData?.exams?.length || 0;
                
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${themeStyles.item}`}
                  >
                    {/* Patient identity tag & timestamp info */}
                    <div>
                      <div className="flex items-start justify-between">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm border ${themeStyles.badge} max-w-[80%] truncate`}>
                          <User className="w-3.5 h-3.5 mr-1 shrink-0" />
                          <span className="truncate">{item.patientName}</span>
                        </span>
                        
                        <div className={`flex items-center text-[10px] ${themeStyles.subText} font-medium whitespace-nowrap ml-2`}>
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDateString(item.timestamp)}
                        </div>
                      </div>

                      {/* Display formatted line summary */}
                      <p className={`mt-2.5 text-xs line-clamp-3 font-mono border-l-2 pl-2 p-1.5 rounded-r ${isDark ? "text-slate-300 bg-black/40 border-slate-800" : "text-slate-600 bg-slate-100/40 border-slate-200"}`}>
                        {item.formattedText}
                      </p>
                    </div>

                    {/* Operational controls */}
                    <div className={`mt-4 pt-3 border-t ${isDark ? "border-slate-800" : "border-slate-100"} flex items-center justify-between`}>
                      <span className={`text-[10px] uppercase tracking-wider font-bold ${themeStyles.subText}`}>
                        {totalExams} {totalExams === 1 ? "exame" : "exames"}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          id={`btn-copy-history-item-${item.id}`}
                          onClick={() => handleCopyText(item.id, item.formattedText)}
                          className={`p-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition-all ${
                            copiedId === item.id
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : isDark 
                                ? "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                          title="Copiar colagem do prontuário"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                          ) : (
                            <Clipboard className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          id={`btn-reload-history-item-${item.id}`}
                          onClick={() => onLoadItem(item)}
                          className={`p-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition-all ${
                            isDark 
                              ? "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                          title="Carregar de volta no editor ativo"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Restaurar</span>
                        </button>

                        <button
                          id={`btn-delete-history-item-${item.id}`}
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1.5 rounded-lg border border-transparent hover:border-rose-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          title="Excluir do histórico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
