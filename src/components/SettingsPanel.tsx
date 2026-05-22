import { AppSettings } from "../types";
import { Sliders, HelpCircle, Check, Sparkles } from "lucide-react";

interface SettingsPanelProps {
  settings: AppSettings;
  onChangeSettings: (settings: AppSettings) => void;
}

export default function SettingsPanel({ settings, onChangeSettings }: SettingsPanelProps) {
  const separators = [
    { label: "Barra Vertical ( | )", value: "|" },
    { label: "Barra Normal ( / )", value: "/" },
    { label: "Ponto e Vírgula ( ; )", value: ";" },
    { label: "Vírgula ( , )", value: "," },
  ];

  const themes = [
    { id: "light", name: "Sleek Blue (Padrão)", color: "bg-blue-600" },
    { id: "hospital", name: "Safira Verde (Teal)", color: "bg-teal-500" },
    { id: "emerald", name: "Bio Clássico (Emerald)", color: "bg-emerald-500" },
    { id: "charcoal", name: "Slate Clínico (Cinza)", color: "bg-slate-700" },
    { id: "dark-emerald", name: "Modern Dark (Emerald)", color: "bg-emerald-600" },
    { id: "midnight", name: "Symphony Night (Azul Dark)", color: "bg-sky-600" },
  ] as const;

  const tonePresets = [
    { name: "Emerald", hex: "#10b981" },
    { name: "Jade", hex: "#059669" },
    { name: "Pine", hex: "#064e3b" },
    { name: "Teal", hex: "#0d9488" },
    { name: "Sky", hex: "#0ea5e9" },
    { name: "Rose", hex: "#f43f5e" },
    { name: "Amber", hex: "#f59e0b" },
    { name: "Slate", hex: "#475569" },
  ];

  const updateSettings = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

  // Theme styling dictionaries
  const themeStyles = {
    light: {
      text: "text-blue-600",
      bg: "bg-blue-50/50",
      border: "border-blue-100",
      badge: "text-blue-700 bg-blue-50 border-blue-200",
      toggleBg: "bg-blue-600",
      btnActive: "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-150",
      ring: "focus:ring-blue-500",
      settingsCard: "bg-white border-slate-200",
      input: "bg-white text-slate-800 border-slate-300",
      label: "text-slate-800",
      subText: "text-slate-500",
    },
    hospital: {
      text: "text-teal-600",
      bg: "bg-teal-50/50",
      border: "border-teal-100",
      badge: "text-teal-700 bg-teal-50 border-teal-200",
      toggleBg: "bg-teal-600",
      btnActive: "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-150",
      ring: "focus:ring-teal-500",
      settingsCard: "bg-white border-slate-200",
      input: "bg-white text-slate-800 border-slate-300",
      label: "text-slate-800",
      subText: "text-slate-500",
    },
    emerald: {
      text: "text-emerald-600",
      bg: "bg-emerald-50/50",
      border: "border-emerald-100",
      badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
      toggleBg: "bg-emerald-600",
      btnActive: "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-150",
      ring: "focus:ring-emerald-500",
      settingsCard: "bg-white border-slate-200",
      input: "bg-white text-slate-800 border-slate-300",
      label: "text-slate-800",
      subText: "text-slate-500",
    },
    charcoal: {
      text: "text-slate-700",
      bg: "bg-slate-100/50",
      border: "border-slate-200",
      badge: "text-slate-800 bg-slate-100 border-slate-300",
      toggleBg: "bg-slate-850",
      btnActive: "bg-slate-850 text-white border-slate-850 shadow-md",
      ring: "focus:ring-slate-700",
      settingsCard: "bg-white border-slate-200",
      input: "bg-white text-slate-800 border-slate-300",
      label: "text-slate-800",
      subText: "text-slate-500",
    },
    "dark-emerald": {
      text: "text-emerald-400",
      bg: "bg-emerald-950/20",
      border: "border-emerald-900/50",
      badge: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50",
      toggleBg: "bg-emerald-600",
      btnActive: "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-950/50",
      ring: "focus:ring-emerald-500",
      settingsCard: "bg-slate-900 border-slate-800",
      input: "bg-slate-950 text-emerald-50 border-slate-800",
      label: "text-emerald-100",
      subText: "text-slate-400",
    },
    midnight: {
      text: "text-sky-400",
      bg: "bg-sky-950/20",
      border: "border-sky-900/50",
      badge: "text-sky-400 bg-sky-950/50 border-sky-900/50",
      toggleBg: "bg-sky-600",
      btnActive: "bg-sky-600 text-white border-sky-600 shadow-lg shadow-sky-950/50",
      ring: "focus:ring-sky-500",
      settingsCard: "bg-slate-950 border-slate-900",
      input: "bg-black text-sky-50 border-slate-900",
      label: "text-sky-100",
      subText: "text-slate-400",
    },
  }[settings.theme] || {
    text: "text-blue-600",
    bg: "bg-blue-50/50",
    border: "border-blue-100",
    badge: "text-blue-700 bg-blue-50 border-blue-200",
    toggleBg: "bg-blue-600",
    btnActive: "bg-blue-600 text-white border-blue-600 shadow-md",
    ring: "focus:ring-blue-500",
    settingsCard: "bg-white border-slate-200",
    input: "bg-white text-slate-800 border-slate-300",
    label: "text-slate-800",
    subText: "text-slate-500",
  };

  return (
    <div className={`${themeStyles.settingsCard} rounded-2xl p-5 transition-all shadow-sm`}>
      <div className={`flex items-center justify-between border-b ${themeStyles.border} pb-3 mb-4`}>
        <div className="flex items-center space-x-2">
          <Sliders className={`w-4 h-4 ${themeStyles.text}`} />
          <h2 className={`font-sans font-bold ${themeStyles.label} text-xs uppercase tracking-wider`}>
            Preferências do Visual e Formatação
          </h2>
        </div>
        <span className={`text-[11px] font-bold ${themeStyles.badge} px-2.5 py-0.5 rounded-full flex items-center`}>
          <HelpCircle className="w-3 h-3 mr-1 opacity-70" />
          Configurações Clínicas
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toggle CAPS LOCK */}
        <div className={`flex flex-col justify-between p-4 rounded-xl ${themeStyles.bg} border ${themeStyles.border}`}>
          <div>
            <h3 className={`font-bold ${themeStyles.label} text-xs uppercase tracking-tight`}>Caixa Alta (CAPS-LOCK)</h3>
            <p className={`text-[11px] ${themeStyles.subText} mt-1 leading-relaxed`}>
              Força todo o texto final da colagem de resultados a ficar em letras maiúsculas.
            </p>
          </div>
          <div className={`mt-4 flex items-center justify-between ${themeStyles.input} p-2.5 rounded-lg border shadow-sm`}>
            <span className="text-xs font-bold opacity-80 uppercase tracking-tighter">
              {settings.capsLock ? "ATIVADO" : "DESATIVADO"}
            </span>
            <button
              id="toggle-caps-lock"
              onClick={() => updateSettings("capsLock", !settings.capsLock)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.capsLock ? themeStyles.toggleBg : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.capsLock ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Separator Selection */}
        <div className={`p-4 rounded-xl ${themeStyles.bg} border ${themeStyles.border}`}>
          <h3 className={`font-bold ${themeStyles.label} text-xs uppercase tracking-tight`}>Divisor de Resultados</h3>
          <p className={`text-[11px] ${themeStyles.subText} mt-1 leading-relaxed`}>
            Caractere que dividirá os exames na linha de resultado.
          </p>
          
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {separators.map((sep) => (
              <button
                key={sep.value}
                id={`sep-preset-${sep.value}`}
                onClick={() => updateSettings("separator", sep.value)}
                className={`py-1.5 px-2 rounded-lg border text-xs font-bold text-center transition-all ${
                  settings.separator === sep.value
                    ? themeStyles.btnActive
                    : `${themeStyles.input} hover:opacity-80`
                }`}
              >
                {sep.label}
              </button>
            ))}
          </div>

          <div className="mt-2.5">
            <input
              id="input-custom-separator"
              type="text"
              maxLength={3}
              value={separators.some((s) => s.value === settings.separator) ? "" : settings.separator}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== "") {
                  updateSettings("separator", val);
                }
              }}
              placeholder="Digite divisor customizado"
              className={`w-full text-xs font-bold px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 ${themeStyles.ring} text-center font-mono ${themeStyles.input}`}
            />
          </div>
        </div>

        {/* Clinical Interface Themes */}
        <div className={`p-4 rounded-xl ${themeStyles.bg} border ${themeStyles.border}`}>
          <h3 className={`font-bold ${themeStyles.label} text-xs uppercase tracking-tight`}>Tema e Visual</h3>
          <p className={`text-[11px] ${themeStyles.subText} mt-1 leading-relaxed`}>
            Selecione uma paleta de cores para sua interface.
          </p>

          <div className="mt-3 space-y-1.5 max-h-[145px] overflow-y-auto pr-1 custom-scrollbar">
            {themes.map((theme) => (
              <button
                key={theme.id}
                id={`theme-${theme.id}`}
                onClick={() => updateSettings("theme", theme.id)}
                className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs font-semibold text-left transition-all ${
                  settings.theme === theme.id
                    ? `${themeStyles.input} border-emerald-500 font-bold shadow-md`
                    : `${themeStyles.input} hover:bg-slate-200/20`
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`w-3.5 h-3.5 rounded-full ${theme.color} border border-white shadow-sm`} />
                  <span className="truncate">{theme.name}</span>
                </div>
                {settings.theme === theme.id && (
                  <Check className={`w-3.5 h-3.5 ${themeStyles.text} mr-1.5`} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Tone Picker */}
        <div className={`p-4 rounded-xl ${themeStyles.bg} border ${themeStyles.border}`}>
          <h3 className={`font-bold ${themeStyles.label} text-xs uppercase tracking-tight`}>Tonalidade do Destaque</h3>
          <p className={`text-[11px] ${themeStyles.subText} mt-1 leading-relaxed`}>
            Personalize a cor principal de destaque da sua experiência.
          </p>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {tonePresets.map((tone) => (
              <button
                key={tone.hex}
                onClick={() => updateSettings("accentTone", tone.hex)}
                className={`group relative w-full aspect-square rounded-lg border-2 transition-all ${
                  settings.accentTone === tone.hex
                    ? "border-white scale-110 shadow-lg"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: tone.hex }}
                title={tone.name}
              >
                {settings.accentTone === tone.hex && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <div className="mt-3 flex items-center gap-2">
            <input 
              type="color" 
              value={settings.accentTone || "#10b981"}
              onChange={(e) => updateSettings("accentTone", e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
            />
            <input 
              type="text"
              value={settings.accentTone || "#10b981"}
              onChange={(e) => updateSettings("accentTone", e.target.value)}
              className={`flex-1 text-[10px] font-mono p-1 rounded border ${themeStyles.input} uppercase`}
            />
          </div>
        </div>
      </div>

      {/* Gemini API Key Section for personal use */}
      <div className="mt-5 p-4 rounded-xl bg-blue-50/40 border border-blue-100 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-tight flex items-center">
              <Sparkles className="w-4 h-4 text-amber-500 mr-1.5 animate-pulse" />
              Sua Chave de API do Gemini Pessoal
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Para transcrever exames, insira sua própria chave gerada gratuitamente no Google AI Studio. 
              Sua chave é salva apenas localmente no seu navegador e não é compartilhada. Se você ainda não tem uma chave, acerte a sua em: {" "}
              <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">Google AI Studio</a>.
            </p>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <input
              id="input-settings-api-key"
              type="password"
              value={settings.geminiApiKey || ""}
              onChange={(e) => updateSettings("geminiApiKey", e.target.value)}
              placeholder="Cole sua API Key aqui (AIzaSy...)"
              className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
            />
            {settings.geminiApiKey ? (
              <p className="text-[10px] text-emerald-600 font-bold mt-1.5 text-right flex items-center justify-end">
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                Chave configurada com sucesso
              </p>
            ) : (
              <p className="text-[10px] text-rose-500 font-semibold mt-1.5 text-right">
                Chave obrigatória para o processamento
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={`mt-4 py-2 px-3.5 rounded-xl bg-slate-50 border border-slate-150 text-[11px] text-slate-600 flex items-start`}>
        <span className={`font-bold uppercase tracking-tight ${themeStyles.text} mr-1.5`}>Dica clínica:</span>
        O resultado no painel à direita atualiza em tempo real sem demandar novas requisições ou cobranças de créditos de inteligência artificial.
      </div>
    </div>
  );
}
