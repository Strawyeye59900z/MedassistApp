import { useState, useEffect, FormEvent, useRef } from "react";
import { AppSettings, TranscriptionResponse, HistoryItem, Prescription, Correction } from "./types";
import { CLINICAL_MOCK_EXAM_TEXT, getDefaultSettings, formatAllExams } from "./utils";
import Header from "./components/Header";
import SettingsPanel from "./components/SettingsPanel";
import ExamResultsView from "./components/ExamResultsView";
import HistoryList from "./components/HistoryList";
import NotesView from "./components/NotesView";
import PrescriptionsView from "./components/PrescriptionsView";
import AdminUsersView from "./components/AdminUsersView";
import { Clipboard, Activity, RefreshCw, AlertCircle, FileText, Sparkles, ClipboardList, LogIn, FileEdit, Users, Stethoscope } from "lucide-react";

import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy, deleteDoc } from "firebase/firestore";

export default function App() {
  const isRegisteringRef = useRef(false);
  const [activeTab, setActiveTab] = useState<"exames" | "notas" | "prescricoes" | "admin">("exames");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<string | null>(null); // To display username
  const [authError, setAuthError] = useState<string | null>(null);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  const [setupApiKey, setSetupApiKey] = useState("");

  // Input elements
  const [pastedText, setPastedText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Active transcription state
  const [parsedData, setParsedData] = useState<TranscriptionResponse | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [isResultSaved, setIsResultSaved] = useState(false);

  // App settings and History persistency
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [showSettings, setShowSettings] = useState(false);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isGoogle = user.providerData.some(p => p.providerId === "google.com");
        const isAdmin = user.email === "gabriel.nunez.costa@gmail.com";

        if (isGoogle && !isAdmin) {
          setAuthError("O login do Google é exclusivo para o Administrador.");
          await signOut(auth);
          setCurrentUser(null);
          setSessionUser(null);
          setIsAuthLoading(false);
          return;
        }

        try {
          const regRef = doc(db, "users_registered", user.uid);
          let regSnap = await getDoc(regRef);

          // Detect newly created auth account to bypass local race conditions
          const isNewUser = user.metadata.creationTime && user.metadata.lastSignInTime && 
                            (user.metadata.creationTime === user.metadata.lastSignInTime || 
                             Math.abs(new Date(user.metadata.creationTime).getTime() - new Date(user.metadata.lastSignInTime).getTime()) < 15000);

          if (!regSnap.exists()) {
            if (isAdmin || isRegisteringRef.current || isNewUser) {
              // Atomically create registration record on the database
              await setDoc(regRef, {
                uid: user.uid,
                email: user.email || "",
                createdAt: new Date().toISOString()
              });
              regSnap = await getDoc(regRef);
              isRegisteringRef.current = false;
            } else {
              setAuthError("Esta conta foi desativada ou excluída pelo administrador.");
              await signOut(auth);
              setCurrentUser(null);
              setSessionUser(null);
              setIsAuthLoading(false);
              return;
            }
          }

          setCurrentUser(user);
          if (user.email) {
            setSessionUser(user.email.split("@")[0]);
          } else {
            setSessionUser(null);
          }
        } catch (err: any) {
          console.error("Erro ao validar registro do usuario:", err);
          const errorMsg = err.message || err.code || String(err);
          setAuthError(`Erro de integridade ao verificar o cadastro no sistema. Detalhes: ${errorMsg}`);
          await signOut(auth);
          setCurrentUser(null);
          setSessionUser(null);
        }
      } else {
        setCurrentUser(null);
        setSessionUser(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load settings from Firestore
  useEffect(() => {
    if (!currentUser) {
      setSettings(getDefaultSettings());
      setHistory([]);
      return;
    }

    const loadSettings = async () => {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setSettings({ ...getDefaultSettings(), ...docSnap.data() as Partial<AppSettings> });
        } else {
          // If first time login, set default settings document
          await setDoc(userRef, getDefaultSettings());
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
      }
    };
    loadSettings();
  }, [currentUser]);

  // Sync history state from Firestore securely using onSnapshot for real-time multi-device sync
  useEffect(() => {
    if (!currentUser) return;

    const historyRef = collection(db, "users", currentUser.uid, "history");
    const q = query(historyRef, orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData: HistoryItem[] = [];
      snapshot.forEach((doc) => {
        historyData.push(doc.data() as HistoryItem);
      });
      setHistory(historyData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/history`);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Sync corrections from Firestore
  useEffect(() => {
    if (!currentUser) {
      setCorrections({});
      return;
    }

    const correctionsRef = collection(db, "users", currentUser.uid, "corrections");
    const unsubscribe = onSnapshot(correctionsRef, (snapshot) => {
      const correctionMap: Record<string, string> = {};
      snapshot.forEach((doc) => {
        const data = doc.data() as Correction;
        correctionMap[data.original] = data.shorthand;
      });
      setCorrections(correctionMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/corrections`);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSaveCorrection = async (original: string, shorthand: string) => {
    if (!currentUser || !original || !shorthand || original === shorthand) return;
    
    // Check if we already have this correction to avoid redundant writes
    if (corrections[original] === shorthand) return;

    try {
      // Use original label as ID (vetted or encoded) to make it unique per term
      const docId = btoa(unescape(encodeURIComponent(original.toLowerCase().trim())));
      const corrRef = doc(db, "users", currentUser.uid, "corrections", docId);
      
      const correctionData: Correction = {
        original: original.trim(),
        shorthand: shorthand.trim(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(corrRef, correctionData);
    } catch (err) {
      // Silent fail for corrections as it's a background helper
      console.error("Failed to save correction:", err);
    }
  };

  const applyCorrections = (data: TranscriptionResponse, correctionMap: Record<string, string>): TranscriptionResponse => {
    if (!data.exams) return data;
    
    return {
      ...data,
      exams: data.exams.map(exam => ({
        ...exam,
        findings: exam.findings.map(finding => {
          const original = finding.originalLabel || finding.label;
          const shorthand = correctionMap[original];
          return {
            ...finding,
            originalLabel: original,
            label: shorthand || finding.label,
            subItems: finding.subItems?.map(sub => {
              const subOriginal = sub.originalLabel || sub.label;
              return {
                ...sub,
                originalLabel: subOriginal,
                label: correctionMap[subOriginal] || sub.label
              };
            })
          };
        })
      }))
    };
  };

  // Save settings on changes
  const handleSettingsChange = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid), newSettings, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    }
  };

  // Run the analysis using server API proxy with Gemini
  const handleAnalyzeText = async (customText?: string) => {
    const textToAnalyze = customText !== undefined ? customText : pastedText;
    if (!textToAnalyze.trim()) {
      setError("Por favor, cole o texto do exame antes de solicitar a transcrição.");
      return;
    }

    // Strict safety block: Require users to use their own Gemini API key
    if (!settings.geminiApiKey?.trim()) {
      setError("Chave de API do Gemini não configurada. Para evitar sobrecargas e garantir o seu processamento seguro, você deve cadastrar sua própria chave no menu de configurações (ícone de engrenagem) no canto superior direito do painel.");
      setShowSettings(true); // Auto-reveal setup so they edit it instantly
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setParsedData(null);
    setActiveHistoryId(null);
    setIsResultSaved(false);

    // Dynamic medical feedback messages for positive clinician UX
    const loadingSteps = [
      "Iniciando comunicação segura com a IA...",
      "Processando sua chave API do Gemini pessoal...",
      "Consolidando e agrupando múltiplos exames de sangue laboratoriais...",
      "Estruturando dados em categoria LAB unificada para uma única linha...",
      "Separando sumários de urina e gasometrias em blocos independentes...",
      "Filtrando unidades de medida indesejadas (sem v/dL, mg/dL)...",
      "Formatando shorthand clínico final..."
    ];

    let stepIndex = 0;
    setAnalysisProgress(loadingSteps[0]);
    
    const interval = setInterval(() => {
      if (stepIndex < loadingSteps.length - 1) {
        stepIndex++;
        setAnalysisProgress(loadingSteps[stepIndex]);
      }
    }, 1200);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Gemini-Key": settings.geminiApiKey || ""
        },
        body: JSON.stringify({ text: textToAnalyze }),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Erro de rede ao analisar o exame.");
      }

      const rawData: TranscriptionResponse = await response.json();
      
      if (!rawData.exams || rawData.exams.length === 0) {
        throw new Error("Não foi possível extrair nenhum exame estruturado deste texto. Verifique se o conteúdo colado contém resultados numéricos.");
      }

      // Apply user-specific abbreviation corrections found in DB
      const data = applyCorrections(rawData, corrections);

      setParsedData(data);
      
      // Auto-save this transcription into local session history
      const id = crypto.randomUUID();
      const autoSaveItem: HistoryItem = {
        id,
        timestamp: new Date().toISOString(),
        patientName: data.patientName || "Não identificado",
        rawInput: textToAnalyze,
        parsedData: data,
        formattedText: formatAllExams(data, settings),
      };

      setHistory((prev) => [autoSaveItem, ...prev]);
      
      // Mark as saved and store current active history id
      setActiveHistoryId(id);
      setIsResultSaved(true);

    } catch (err: any) {
      clearInterval(interval);
      console.error("Erro na requisição à IA:", err);
      setError(
        err.message || 
        "Houve uma falha ao contatar a IA do Gemini. Verifique sua chave ou tente novamente."
      );
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress("");
    }
  };

  // Save/Update manual edits in the local session history
  const handleSaveToHistory = async () => {
    if (!parsedData || !currentUser) return;

    const formatted = formatAllExams(parsedData, settings);
    const id = activeHistoryId || crypto.randomUUID();

    const docData: HistoryItem = {
      id,
      timestamp: new Date().toISOString(),
      patientName: parsedData.patientName || "Não identificado",
      rawInput: pastedText,
      parsedData: parsedData,
      formattedText: formatted,
    };

    setError(null);
    try {
      await setDoc(doc(db, "users", currentUser.uid, "history", id), docData);
      setActiveHistoryId(id);
      setIsResultSaved(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/history/${id}`);
    }
  };

  // Restore previous historical record back up into working screen
  const handleLoadFromHistory = (item: HistoryItem) => {
    setParsedData(item.parsedData);
    setPastedText(item.rawInput);
    setActiveHistoryId(item.id);
    setIsResultSaved(true);
    setError(null);

    // Scroll back up to the working area smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete historical patient record from local session history
  const handleDeleteHistoryItem = async (id: string) => {
    if (!currentUser) return;
    setError(null);
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "history", id));
      if (activeHistoryId === id) {
        setActiveHistoryId(null);
        setIsResultSaved(false);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/history/${id}`);
    }
  };

  // Clear all history from this session
  const handleClearAllHistory = async () => {
    if (!currentUser || history.length === 0) return;
    setError(null);
    try {
      // In a real app we'd batch delete, but for this simple version we can delete one by one
      for (const item of history) {
        await deleteDoc(doc(db, "users", currentUser.uid, "history", item.id));
      }
      setActiveHistoryId(null);
      setIsResultSaved(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/history`);
    }
  };

  // Load and analyze clinical demo report
  const handleLoadDemo = () => {
    setPastedText(CLINICAL_MOCK_EXAM_TEXT);
    // Let user run or configure things first
    if (!settings.geminiApiKey?.trim()) {
      setError("Dica: Antes de testar o exemplo, lembre-se de cadastrar sua Chave de API do Gemini no painel de Configurações abaixo.");
      setShowSettings(true);
    } else {
      handleAnalyzeText(CLINICAL_MOCK_EXAM_TEXT);
    }
  };

  // Custom theme colors for responsive Tailwind border/buttons
  const themeClasses = {
    hospital: {
      bg: "bg-slate-50",
      text: "text-slate-800",
      accent: "text-teal-600 bg-teal-50 border-teal-200",
      primaryBtn: "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/10",
      focusRing: "focus:ring-teal-500 focus:border-teal-500",
      accentBorder: "border-teal-500/30",
      spinnerBorder: "border-t-teal-600",
      testBtn: "text-teal-600 hover:text-teal-700 border-teal-150 bg-teal-50 hover:bg-teal-100/60",
      card: "bg-white border-slate-200",
      navBg: "bg-slate-200/50",
      navActive: "bg-white text-blue-600 shadow-sm",
    },
    emerald: {
      bg: "bg-slate-50",
      text: "text-slate-800",
      accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
      primaryBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10",
      focusRing: "focus:ring-emerald-500 focus:border-emerald-500",
      accentBorder: "border-emerald-500/30",
      spinnerBorder: "border-t-emerald-600",
      testBtn: "text-emerald-600 hover:text-emerald-700 border-emerald-150 bg-emerald-50 hover:bg-emerald-100/60",
      card: "bg-white border-slate-200",
      navBg: "bg-slate-200/50",
      navActive: "bg-white text-emerald-600 shadow-sm",
    },
    light: {
      bg: "bg-slate-50",
      text: "text-slate-800",
      accent: "text-blue-600 bg-blue-50 border-blue-200",
      primaryBtn: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10",
      focusRing: "focus:ring-blue-500 focus:border-blue-500",
      accentBorder: "border-blue-500/30",
      spinnerBorder: "border-t-blue-600",
      testBtn: "text-blue-600 hover:text-blue-700 border-blue-150 bg-blue-50 hover:bg-blue-100/60",
      card: "bg-white border-slate-200",
      navBg: "bg-slate-200/50",
      navActive: "bg-white text-blue-600 shadow-sm",
    },
    charcoal: {
      bg: "bg-slate-100",
      text: "text-slate-900",
      accent: "text-slate-700 bg-slate-100 border-slate-300",
      primaryBtn: "bg-slate-800 hover:bg-slate-950 text-white shadow-slate-900/10",
      focusRing: "focus:ring-slate-700 focus:border-slate-700",
      accentBorder: "border-slate-800/30",
      spinnerBorder: "border-t-slate-800",
      testBtn: "text-slate-700 hover:text-slate-800 border-slate-300 bg-slate-100 hover:bg-slate-200/60",
      card: "bg-white border-slate-200",
      navBg: "bg-slate-200/50",
      navActive: "bg-white text-slate-800 shadow-sm",
    },
    "dark-emerald": {
      bg: "bg-slate-950",
      text: "text-slate-100",
      accent: "text-emerald-400 bg-emerald-950/30 border-emerald-900/50",
      primaryBtn: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20",
      focusRing: "focus:ring-emerald-500 focus:border-emerald-500",
      accentBorder: "border-emerald-500/20",
      spinnerBorder: "border-t-emerald-500",
      testBtn: "text-emerald-400 hover:text-emerald-300 border-emerald-900/50 bg-emerald-950/50 hover:bg-emerald-900/50",
      card: "bg-slate-900 border-slate-800",
      navBg: "bg-slate-900/80 backdrop-blur-md border border-slate-800",
      navActive: "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20",
    },
    midnight: {
      bg: "bg-black",
      text: "text-slate-200",
      accent: "text-sky-400 bg-sky-950/30 border-sky-900/50",
      primaryBtn: "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/20",
      focusRing: "focus:ring-sky-500 focus:border-sky-500",
      accentBorder: "border-sky-500/20",
      spinnerBorder: "border-t-sky-500",
      testBtn: "text-sky-400 hover:text-sky-300 border-sky-900/50 bg-sky-950/50 hover:bg-sky-900/50",
      card: "bg-slate-950 border-slate-900",
      navBg: "bg-slate-950/80 backdrop-blur-md border border-slate-900",
      navActive: "bg-sky-600 text-white shadow-lg shadow-sky-900/20",
    }
  }[settings.theme] || {
    bg: "bg-slate-50",
    text: "text-slate-800",
    accent: "text-blue-600 bg-blue-50 border-blue-200",
    primaryBtn: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10",
    focusRing: "focus:ring-blue-500",
    accentBorder: "border-blue-500/30",
    spinnerBorder: "border-t-blue-600",
    testBtn: "text-blue-600 hover:text-blue-700 border-blue-150 bg-blue-50 hover:bg-blue-100/60",
    card: "bg-white border-slate-200",
    navBg: "bg-slate-200/50",
    navActive: "bg-white text-blue-600 shadow-sm",
  };

  // Auth Loading View
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-blue-500 animate-spin" />
        <p className="text-xs font-semibold text-slate-500 font-mono">Verificando sessão segura multiplataforma...</p>
      </div>
    );
  }

  // Active Authenticated Application Screen
  if (!currentUser) {
    const handleEmailAuth = async (e: FormEvent) => {
      e.preventDefault();
      setAuthError(null);
      setIsAuthSubmitting(true);
      
      const emailValue = authEmail.trim();
      const passwordValue = authPassword;

      if (!emailValue || !passwordValue) {
        setAuthError("Preencha todos os campos.");
        setIsAuthSubmitting(true);
        return;
      }

      if (passwordValue.length < 6) {
        setAuthError("A senha deve conter no mínimo 6 caracteres.");
        setIsAuthSubmitting(true);
        return;
      }

      try {
        if (isSignUp) {
          // Cadastro
          isRegisteringRef.current = true;
          const res = await createUserWithEmailAndPassword(auth, emailValue, passwordValue);
          if (res.user) {
            // Write to registered users directory
            const regRef = doc(db, "users_registered", res.user.uid);
            await setDoc(regRef, {
              uid: res.user.uid,
              email: res.user.email || "",
              createdAt: new Date().toISOString()
            });
          }
        } else {
          // Login
          await signInWithEmailAndPassword(auth, emailValue, passwordValue);
        }
        
        // Clear fields on success
        setAuthEmail("");
        setAuthPassword("");
      } catch (err: any) {
        console.error("Auth Fail:", err.code || err.message);
        let errorMsg = "Ocorreu um erro ao verificar acesso.";
        if (err.code === "auth/email-already-in-use") {
          errorMsg = "Este e-mail médico já se encontra em uso.";
        } else if (err.code === "auth/invalid-email") {
          errorMsg = "Insira um endereço de e-mail clinicamente válido.";
        } else if (err.code === "auth/weak-password") {
          errorMsg = "Senha muito fraca. Escolha algo mais seguro.";
        } else if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
          errorMsg = "E-mail ou senha clínicos incorretos.";
        } else {
          errorMsg = err.message || errorMsg;
        }
        setAuthError(errorMsg);
      } finally {
        setIsAuthSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header Banner - Medassist brand styled */}
          <div className="p-8 bg-emerald-600 text-white relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-700 opacity-95" />
            <div className="relative z-10 space-y-3">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-md">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight">Medassist</h1>
              <p className="text-emerald-100 text-[11.5px] max-w-xs leading-relaxed font-medium">
                Auxiliar hospitalar inteligente para extração de exames e condutas médicas.
              </p>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          </div>

          <div className="p-8 space-y-5">
            {/* Tabs Trigger */}
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setAuthError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  !isSignUp ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setAuthError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  isSignUp ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Cadastrar-se
              </button>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  E-mail do Profissional
                </label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="seu.nome@hospital.com"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Senha Clinicamente Segura
                </label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="******"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isAuthSubmitting}
                className="w-full py-3 bg-emerald-650 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
                style={{ backgroundColor: "#059669" }}
              >
                {isAuthSubmitting ? "Processando..." : isSignUp ? "Criar Conta de Acesso" : "Entrar no Sistema"}
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Porta do Administrador
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Admin Bypass Sign-In */}
            <button
              onClick={async () => {
                setAuthError(null);
                try {
                  const provider = new GoogleAuthProvider();
                  provider.setCustomParameters({
                    prompt: 'select_account'
                  });
                  await signInWithPopup(auth, provider);
                } catch (err: any) {
                  console.error("Auth Fail:", err.code || err.message);
                  setAuthError(`Erro ao entrar com o Google: ${err.message}`);
                }
              }}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer active:scale-[0.98]"
            >
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Acesso Administrador com Google</span>
            </button>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-[10px] text-rose-700 leading-relaxed font-semibold">
                {authError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSessionUser(null);
      setSettings(getDefaultSettings());
      setHistory([]);
      setSetupApiKey("");
    } catch (err) {
      console.error("Erro ao deslogar", err);
    }
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} pb-24 transition-all duration-300`}>
      {/* Premium Medical Navigation Bar */}
      <Header
        showSettings={showSettings}
        onOpenSettings={() => setShowSettings(!showSettings)}
        user={sessionUser}
        onLogout={handleLogout}
        theme={settings.theme}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* API SETUP GATE */}
        {!settings.geminiApiKey ? (
          <div className={`${themeClasses.card} rounded-3xl border shadow-lg p-10 max-w-xl mx-auto mt-12 text-center animate-fade-in`}>
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Stethoscope className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Bem-vindo(a) ao Medassist!</h2>
            <p className="text-xs leading-relaxed opacity-75 mb-8">
              Como parte das políticas de segurança e privacidade do <strong>Medassist</strong>, o cadastramento de sua própria chave de API do Gemini é obrigatório para utilizar os processos com IA no aplicativo. 
              Esta chave é particular de cada usuário e deve ser cadastrada apenas no primeiro login, ficando salva de forma sincronizada com o banco de dados seguro para as suas próximas sessões em qualquer dispositivo.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (setupApiKey.trim()) {
                handleSettingsChange({ ...settings, geminiApiKey: setupApiKey.trim() });
              }
            }} className="space-y-4">
              <input
                type="password"
                value={setupApiKey}
                onChange={(e) => setSetupApiKey(e.target.value)}
                placeholder="Insira sua Chave do Gemini (AIzaSyB...)"
                className={`w-full text-center p-4 text-sm ${themeClasses.card} rounded-xl focus:outline-none focus:ring-1 ${themeClasses.focusRing}`}
                required
              />
              <button
                type="submit"
                className={`w-full py-4 px-6 ${themeClasses.primaryBtn} font-bold text-sm rounded-xl shadow-sm transition-all cursor-pointer`}
                style={{ backgroundColor: settings.accentTone }}
              >
                Salvar Chave e Acessar o Medassist
              </button>
            </form>
            <div className="mt-6 text-[11px] opacity-50">
              Sua chave fica armazenada com segurança na sua própria conta de forma criptografada e não é compartilhada. <br/>
              <span className="opacity-90">Caso precise criar uma nova: </span>
              <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline font-bold">Obter chave gratuitamente no Google AI Studio</a>.
            </div>
          </div>
        ) : (
          <>
            {/* Settings panel accordion with smooth display */}
            {showSettings && (
              <SettingsPanel
                settings={settings}
                onChangeSettings={handleSettingsChange}
              />
            )}

            {/* Main Content Area */}
            {activeTab === "exames" ? (
              <>
                {/* Input Text Card */}
                <div className={`${themeClasses.card} rounded-2xl border shadow-sm p-5`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 ${themeClasses.bg} rounded-lg`}>
                <ClipboardList className="w-4 h-4 opacity-70" />
              </div>
              <div>
                <h2 className="font-sans font-semibold text-sm">
                  Copiar e Colar Texto do Exame (PDF)
                </h2>
                <p className="text-xs opacity-50">
                  Insira o conteúdo bruto selecionado do PDF do exame do paciente
                </p>
              </div>
            </div>

            <button
              id="btn-load-mock-demo"
              type="button"
              onClick={handleLoadDemo}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center border ${themeClasses.testBtn}`}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              Testar com Exemplo de Laboratório
            </button>
          </div>

          {/* Raw copy textarea */}
          <div className="relative">
            <textarea
              id="raw-pdf-input"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Cole aqui o texto copiado de qualquer exame em PDF..."
              className={`w-full h-44 p-4 text-xs font-mono rounded-2xl focus:outline-none focus:ring-1 focus:border-transparent ${themeClasses.card} ${themeClasses.bg} ${themeClasses.focusRing} transition-all leading-relaxed`}
            />
            {pastedText && (
              <button
                id="btn-clear-textbox"
                onClick={() => setPastedText("")}
                className={`absolute right-4 bottom-4 p-1 rounded border text-[10px] font-semibold flex items-center shadow-sm ${themeClasses.card} opacity-70 hover:opacity-100`}
              >
                Limpar
              </button>
            )}
          </div>

          {/* Action trigger and errors */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="opacity-50 text-xs flex items-center italic">
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-500 animate-pulse" />
              Análise alimentada pelo modelo de alta velocidade Gemini
            </div>

            <button
              id="btn-trigger-transcribe"
              disabled={isAnalyzing || !pastedText.trim()}
              onClick={() => handleAnalyzeText()}
              className={`py-3 px-6 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all ${
                !pastedText.trim()
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : isAnalyzing
                  ? `${themeClasses.accent} cursor-wait`
                  : `${themeClasses.primaryBtn} hover:shadow-md cursor-pointer active:scale-[0.99]`
              }`}
              style={!isAnalyzing && pastedText.trim() ? { backgroundColor: settings.accentTone } : {}}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  <span>Transcrever Exame para o Prontuário</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Loading Spinner Screen */}
        {isAnalyzing && (
          <div className={`rounded-2xl border ${themeClasses.card} p-12 text-center animate-fade-in flex flex-col items-center justify-center space-y-4`}>
            <div className={`w-12 h-12 rounded-full border-4 border-slate-100/20 ${themeClasses.spinnerBorder} animate-spin`} />
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">
                Transcrevendo dados com inteligência artificial...
              </h3>
              <p className="text-xs opacity-50 font-mono italic">
                {analysisProgress}
              </p>
            </div>
          </div>
        )}

        {/* Server or Configuration Error Alerts */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Aviso ou Falha de Processamento</h4>
              <p className="text-xs mt-1 leading-relaxed text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* Formatted Output and Interactive Editor */}
        {parsedData && !isAnalyzing && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold opacity-40 uppercase tracking-widest pl-1">
              <FileText className="w-4 h-4" />
              <span>Resultados Estruturados da Transcrição</span>
            </div>
            
            <ExamResultsView
              data={parsedData}
              settings={settings}
              onUpdateData={(updated) => {
                setParsedData(updated);
                setIsResultSaved(false); // edits require resaving
              }}
              onSaveCorrection={handleSaveCorrection}
              onSaveToHistory={handleSaveToHistory}
              isSaved={isResultSaved}
            />
          </div>
        )}

        {/* Historical patient catalog */}
        {!isAnalyzing && (
          <HistoryList
            history={history}
            theme={settings.theme}
            onLoadItem={handleLoadFromHistory}
            onDeleteItem={handleDeleteHistoryItem}
            onClearAll={handleClearAllHistory}
          />
        )}
        </>
            ) : activeTab === "notas" ? (
              <div className="animate-fade-in mt-4">
                <NotesView currentUser={currentUser} settings={settings} corrections={corrections} />
              </div>
            ) : activeTab === "prescricoes" ? (
              <div className="animate-fade-in mt-4">
                <PrescriptionsView currentUser={currentUser} settings={settings} />
              </div>
            ) : (
              <div className="animate-fade-in mt-4">
                <AdminUsersView themeStyles={themeClasses} />
              </div>
            )}
        </>
        )}
      </main>

      {/* Sticky Bottom Navigation */}
      {currentUser && settings.geminiApiKey && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-fit px-4 pointer-events-none">
          <nav className={`pointer-events-auto flex items-center p-1.5 ${themeClasses.navBg} rounded-2xl shadow-2xl ring-1 ring-white/10 backdrop-blur-xl animate-in slide-in-from-bottom-8 duration-500`}>
            <button
              onClick={() => setActiveTab("exames")}
              className={`flex items-center px-4 sm:px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "exames" 
                  ? themeClasses.navActive 
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              style={activeTab === "exames" ? { backgroundColor: settings.accentTone } : {}}
            >
              <Activity className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Laboratório & Exames</span>
              <span className="sm:hidden">Exames</span>
            </button>
            <button
              onClick={() => setActiveTab("notas")}
              className={`flex items-center px-4 sm:px-6 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "notas" 
                  ? themeClasses.navActive 
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              style={activeTab === "notas" ? { backgroundColor: settings.accentTone } : {}}
            >
              <FileEdit className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Bloco de Admissão</span>
              <span className="sm:hidden">Notas</span>
            </button>
            <button
              onClick={() => setActiveTab("prescricoes")}
              className={`flex items-center px-4 sm:px-6 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "prescricoes" 
                  ? themeClasses.navActive 
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              style={activeTab === "prescricoes" ? { backgroundColor: settings.accentTone } : {}}
            >
              <Clipboard className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Biblioteca de Prescrições</span>
              <span className="sm:hidden">Condutas</span>
            </button>
            {currentUser?.email === "gabriel.nunez.costa@gmail.com" && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`flex items-center px-4 sm:px-6 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "admin" 
                    ? themeClasses.navActive 
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
                style={activeTab === "admin" ? { backgroundColor: settings.accentTone } : {}}
              >
                <Users className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Gerenciamento</span>
                <span className="sm:hidden">Gerenciar</span>
              </button>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
