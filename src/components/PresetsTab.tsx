import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, deleteDoc, updateDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { User } from "firebase/auth";
import { Prescription } from "../types";
import { INITIAL_PRESETS } from "../data/initialPresets";
import { Trash2, Edit2, Check, X, Copy, Plus, Save, Sparkles, FolderPlus } from "lucide-react";

interface PresetsTabProps {
  currentUser: User | null;
  settings: any;
  onApplyPreset: (prescriptions: Prescription[]) => void;
  currentPrescriptions?: Prescription[]; // New prop to allow saving current library as preset
}

export default function PresetsTab({ currentUser, settings, onApplyPreset, currentPrescriptions = [] }: PresetsTabProps) {
  const [presets, setPresets] = useState<any[]>([]);
  const isAdmin = currentUser?.email === "gabriel.nunez.costa@gmail.com";
  const isDark = settings.theme === "dark-emerald" || settings.theme === "midnight";

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

        if (pList.length === 0 && isAdmin) {
          // Seed initial presets only once if totally empty
          INITIAL_PRESETS.forEach((preset) => {
            setDoc(doc(db, "presets", preset.id), preset);
          });
        }
        setPresets(pList.length > 0 ? pList : INITIAL_PRESETS);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "presets");
      }
    );
    return () => unsubscribe();
  }, [isAdmin]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? "text-slate-100" : "text-slate-800"}`}>
              <Sparkles className="w-5 h-5 text-amber-500" />
              Bibliotecas Clínicas Predefinidas
            </h2>
            <p className="text-xs text-slate-500 mt-1">Carregue coleções inteiras de protocolos organizados por sistemas em um clique.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {presets.map((preset) => (
          <div key={preset.id} className={`p-6 border rounded-3xl flex flex-col justify-between space-y-6 transition-all hover:shadow-lg ${isDark ? "bg-slate-900/60 border-slate-800 hover:border-amber-500/30" : "bg-white border-slate-200 hover:border-amber-500/30"}`}>
            <div>
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
                  <FolderPlus className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-800"}`}>{preset.name}</h3>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1">
                  {preset.prescriptions?.length || 0} {preset.prescriptions?.length === 1 ? "Protocolo" : "Protocolos"}
                </p>
              </div>
            </div>

            <button 
              onClick={() => onApplyPreset(preset.prescriptions)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Importar para Minha Biblioteca
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
