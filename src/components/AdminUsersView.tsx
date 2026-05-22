import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Users, Trash2, Search, Calendar, ShieldCheck, UserMinus } from "lucide-react";

interface UserRecord {
  uid: string;
  email: string;
  createdAt: string;
}

interface AdminUsersViewProps {
  themeStyles: any;
}

export default function AdminUsersView({ themeStyles }: AdminUsersViewProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Tem certeza que deseja excluir esta conta? Isso impedirá o usuário de fazer novos logins.")) {
      setDeletingId(userId);
      try {
        // Delete registration doc to block login
        await deleteDoc(doc(db, "users_registered", userId));
        
        // Purge settings
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
    <div className={`p-6 rounded-3xl border shadow-md ${themeStyles.card}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Gerenciamento de Contas</h2>
            <p className="text-xs text-slate-500">
              Visualize usuários registrados no sistema e delete contas
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 ${themeStyles.focusRing} ${themeStyles.card}`}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className={`w-8 h-8 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin`} />
          <p className="text-xs font-semibold text-slate-400">Carregando lista de usuários...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <UserMinus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Nenhum usuário cadastrado ou encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-mono">
                <th className="pb-3 font-semibold">E-mail do Usuário</th>
                <th className="pb-3 font-semibold hidden md:table-cell">ID do Usuário</th>
                <th className="pb-3 font-semibold">Cadastro</th>
                <th className="pb-3 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((user) => {
                const isAdmin = user.email === "gabriel.nunez.costa@gmail.com";
                return (
                  <tr key={user.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                    <td className="py-3.5 pr-3 font-medium flex items-center gap-2">
                      <span className="truncate max-w-[200px] sm:max-w-none" title={user.email}>
                        {user.email}
                      </span>
                      {isAdmin && (
                        <span className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-mono font-bold px-1.5 py-0.5 rounded-md">
                          <ShieldCheck className="w-3 h-3" />
                          ADMIN
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 font-mono text-slate-400 hidden md:table-cell">
                      {user.uid}
                    </td>
                    <td className="py-3.5 text-slate-500">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(user.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      {isAdmin ? (
                        <span className="text-[10px] text-slate-400 font-bold">Imutável</span>
                      ) : (
                        <button
                          id={`btn-delete-${user.uid}`}
                          onClick={() => handleDeleteUser(user.uid)}
                          disabled={deletingId === user.uid}
                          className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 text-[11px] font-bold rounded-lg transition-all flex items-center space-x-1 ml-auto cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{deletingId === user.uid ? "Deletando..." : "Excluir"}</span>
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
    </div>
  );
}
