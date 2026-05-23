import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Users, Trash2, Search, Calendar, ShieldCheck, UserMinus, Sparkles, Plus, Save, FolderPlus, Library } from "lucide-react";
import { User } from "firebase/auth";

interface UserRecord {
  uid: string;
  email: string;
  createdAt: string;
}

interface AdminUsersViewProps {
  themeStyles: any;
  currentUser: User | null;
  settings: any;
}

export default function AdminUsersView({ themeStyles, currentUser, settings }: AdminUsersViewProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Library Management State
  const [presets, setPresets] = useState<any[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);

  const isDark = settings.theme === "dark-emerald" || settings.theme === "midnight";

  useEffect(() => {
    const usersRef = collection(db, "users_registered");
    const q = query(usersRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersList: UserRecord[] = [];
        snapshot.forEach((doc) => {
          usersList.push(doc.data() as UserRecord);
        });
        setUsers(usersList);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "users_registered");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const presetsRef = collection(db, "presets");
    const unsubscribe = onSnapshot(
      presetsRef,
      (snapshot) => {
        const pList: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          pList.push({ ...data, id: docSnap.id });
        });
        setPresets(pList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "presets");
      }
    );
    return () => unsubscribe();
  }, []);

  const handleCreatePresetFromJSON = async () => {
    if (!newPresetName.trim() || !jsonInput.trim()) {
      alert("Por favor, preencha o nome da biblioteca e cole o JSON do prompt extraído.");
      return;
    }
    
    setIsImporting(true);
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(jsonInput);
      } catch (e) {
        throw new Error("JSON inválido. Certifique-se de colar o conteúdo exatamente como extraído pela IA.");
      }

      // If the JSON has a "prescriptions" key (standard prompt output)
      const listToSave = Array.isArray(parsedData) ? parsedData : (parsedData.prescriptions || []);
      
      if (!Array.isArray(listToSave) || listToSave.length === 0) {
        throw new Error("O JSON não contém uma lista de prescrições válida.");
      }

      const presetId = `preset_${Date.now()}`;
      await setDoc(doc(db, "presets", presetId), {
        id: presetId,
        name: newPresetName.trim(),
        prescriptions: listToSave,
        createdAt: new Date().toISOString()
      });

      setNewPresetName("");
      setJsonInput("");
      alert("Biblioteca predefinida criada com sucesso!");
    } catch (err: any) {
      alert(err.message || "Erro ao importar JSON.");
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeletePreset = async (id: string) => {
    try {
      await deleteDoc(doc(db, "presets", id));
      setPresetToDelete(null);
      alert("Biblioteca excluída com sucesso.");
    } catch (err) {
      alert("Erro ao excluir. Verifique as permissões.");
      handleFirestoreError(err, OperationType.DELETE, "presets");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Tem certeza que deseja excluir esta conta? Isso impedirá o usuário de fazer novos logins.")) {
      setDeletingId(userId);
      try {
        await deleteDoc(doc(db, "users_registered", userId));
        await deleteDoc(doc(db, "users", userId));
        alert("Conta deletada com sucesso no banco de dados.");
      } catch (err) {
        console.error("Erro ao deletar usuário:", err);
        alert("Erro ao remover a conta. Verifique as permissões.");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`p-6 rounded-3xl border shadow-md space-y-10 ${themeStyles.card}`}>
      {/* Predefined Libraries Management Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Bibliotecas Predefinidas</h2>
            <p className="text-xs text-slate-500">Crie, importe e gerencie coleções globais de protocolos</p>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-amber-50/30 border-amber-100"} space-y-6`}>
          <div className="flex items-center gap-2 border-b border-amber-200/20 pb-3">
            <Plus className="w-4 h-4 text-amber-500" />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>Nova Biblioteca</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Nome da Biblioteca</label>
              <input 
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Ex: Protocolos UTI v2.0..."
                className={`w-full text-xs px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-bold ${isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-200"}`}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Colar JSON da IA</label>
              <textarea 
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='Cole o JSON {"prescriptions": [...] } aqui...'
                className={`w-full text-[10px] px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono h-24 ${isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-white border-slate-200"}`}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              onClick={handleCreatePresetFromJSON}
              disabled={isImporting || !newPresetName.trim() || !jsonInput.trim()}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar e Publicar Biblioteca
            </button>
          </div>

          {presets.length > 0 && (
            <div className="mt-8 pt-8 border-t border-amber-200/20">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6 ml-1">Bibliotecas Publicadas Atualmente</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {presets.map(preset => (
                  <div key={preset.id} className={`p-4 rounded-2xl border transition-all ${isDark ? "bg-slate-950 border-slate-800 hover:border-amber-500/30" : "bg-white border-slate-200 hover:shadow-md"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 truncate">
                        <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl shrink-0">
                          <FolderPlus className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold truncate leading-tight">{preset.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{preset.prescriptions?.length || 0} protocolos</p>
                        </div>
                      </div>

                      {presetToDelete === preset.id ? (
                        <div className="flex items-center gap-1 animate-scale-in shrink-0">
                          <button 
                            onClick={() => handleDeletePreset(preset.id)}
                            className="p-1 px-2 bg-rose-600 text-white text-[9px] font-bold rounded-lg hover:bg-rose-700"
                          >
                            Sim
                          </button>
                          <button 
                            onClick={() => setPresetToDelete(null)}
                            className="p-1 px-2 bg-slate-200 text-slate-700 text-[9px] font-bold rounded-lg hover:bg-slate-300"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setPresetToDelete(preset.id)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl transition-all cursor-pointer shrink-0"
                          title="Remover Biblioteca"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* User Accounts Management Section */}
      <section className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Gerenciamento de Contas</h2>
              <p className="text-xs text-slate-500">Visualize e gerencie acessos de usuários ao sistema</p>
            </div>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 ${themeStyles.focusRing} ${themeStyles.card}`}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className={`w-8 h-8 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin`} />
            <p className="text-xs font-semibold text-slate-400">Carregando lista...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-900 rounded-3xl">
            <UserMinus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-mono">
                  <th className="pb-3 font-semibold pb-4">Profissional</th>
                  <th className="pb-3 font-semibold hidden md:table-cell pb-4">ID Sistema</th>
                  <th className="pb-3 font-semibold pb-4">Acesso desde</th>
                  <th className="pb-3 font-semibold text-right pb-4">Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((user) => {
                  const isAdminUser = user.email === "gabriel.nunez.costa@gmail.com";
                  return (
                    <tr key={user.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 group">
                      <td className="py-4 pr-3 font-medium flex items-center gap-2">
                        <span className="truncate max-w-[200px] sm:max-w-none" title={user.email}>
                          {user.email}
                        </span>
                        {isAdminUser && (
                          <span className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-mono font-bold px-1.5 py-0.5 rounded-md">
                            <ShieldCheck className="w-3 h-3" />
                            ADMIN
                          </span>
                        )}
                      </td>
                      <td className="py-4 font-mono text-slate-400 hidden md:table-cell">
                        {user.uid.slice(0, 8)}...
                      </td>
                      <td className="py-4 text-slate-500">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        {isAdminUser ? (
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Protegido</span>
                        ) : (
                          <button
                            onClick={() => handleDeleteUser(user.uid)}
                            disabled={deletingId === user.uid}
                            className="p-1 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 text-[11px] font-bold rounded-lg transition-all inline-flex items-center space-x-1 ml-auto cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{deletingId === user.uid ? "Removendo..." : "Excluir"}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg 
    className={`animate-spin ${className}`} 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
