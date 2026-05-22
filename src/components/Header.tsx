import { Sparkles, Settings, LogOut, User as UserIcon, Stethoscope } from "lucide-react";

interface HeaderProps {
  onOpenSettings: () => void;
  showSettings: boolean;
  user?: string;
  onLogout?: () => void;
  theme?: string;
  geminiModel?: string;
}

export default function Header({ onOpenSettings, showSettings, user, onLogout, theme, geminiModel }: HeaderProps) {
  const isDark = theme === "dark-emerald" || theme === "midnight";
  
  return (
    <header className={`h-16 border-b px-6 sticky top-0 z-40 shadow-sm transition-colors duration-300 ${
      isDark ? "bg-slate-950/80 border-slate-900 backdrop-blur-md" : "bg-white border-slate-200"
    }`}>
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
        {/* Brand logo - Sleek Interface style */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-emerald-500/10">
            <Stethoscope className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? "text-emerald-50" : "text-slate-800"}`}>
              Med<span className="text-emerald-500 font-semibold">assist</span>
            </h1>
            <p className={`text-[10px] uppercase tracking-widest font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Auxiliar Hospitalar • <span className="opacity-70 font-medium">Gabriel Nuñez Costa</span>
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2.5">
          <div className={`hidden md:flex items-center text-[11px] font-semibold px-3 py-1.5 border rounded-xl font-mono ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-500"
          }`}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500 animate-pulse" />
            {geminiModel || "Gemini"}
          </div>
          
          {/* Settings Trigger */}
          <button
            id="btn-toggle-settings"
            onClick={onOpenSettings}
            className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all duration-200 ${
              showSettings
                ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200"
                : isDark 
                  ? "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
            title="Ajustar preferências de formatação"
          >
            <Settings className={`w-4 h-4 ${showSettings ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Configurações</span>
          </button>

          {user && (
            <div className={`flex items-center space-x-2 px-2.5 py-1.5 border rounded-xl ${
              isDark ? "bg-slate-900/80 border-slate-800" : "bg-slate-50/80 border-slate-200/60"
            }`}>
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <span className={`hidden lg:inline text-xs font-bold max-w-[120px] truncate ${isDark ? "text-slate-300" : "text-slate-700"}`} title={user}>
                {user}
              </span>
              
              <button
                id="btn-logout"
                onClick={onLogout}
                className={`p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors ml-1 ${isDark ? "hover:bg-rose-950/30" : ""}`}
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
