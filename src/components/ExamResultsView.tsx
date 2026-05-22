import { useState, useMemo } from "react";
import { TranscriptionResponse, AppSettings, Exam, Finding, SubItem } from "../types";
import { formatAllExams } from "../utils";
import { Copy, Check, Edit2, Plus, Trash2, FileText, User, Calendar, CheckSquare, PlusCircle } from "lucide-react";

interface ExamResultsViewProps {
  data: TranscriptionResponse;
  settings: AppSettings;
  onUpdateData: (updated: TranscriptionResponse) => void;
  onSaveCorrection?: (original: string, shorthand: string) => void;
  onSaveToHistory: () => void;
  isSaved: boolean;
}

export default function ExamResultsView({
  data,
  settings,
  onUpdateData,
  onSaveCorrection,
  onSaveToHistory,
  isSaved,
}: ExamResultsViewProps) {
  const [copied, setCopied] = useState(false);
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [patientInput, setPatientInput] = useState(data.patientName);

  // Automatically compute the final text representation using the formatter
  const formattedOutput = useMemo(() => {
    return formatAllExams(data, settings);
  }, [data, settings]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Inline edit handlers for patient name
  const savePatientName = () => {
    onUpdateData({
      ...data,
      patientName: patientInput.trim() || "Não identificado",
    });
    setIsEditingPatient(false);
  };

  // Update specific exam properties (e.g., category, date, customTitle)
  const updateExamProps = (examIndex: number, key: keyof Exam, value: any) => {
    const updatedExams = [...data.exams];
    updatedExams[examIndex] = {
      ...updatedExams[examIndex],
      [key]: value,
    };
    onUpdateData({ ...data, exams: updatedExams });
  };

  // Delete an entire exam card
  const deleteExam = (examIndex: number) => {
    const updatedExams = data.exams.filter((_, idx) => idx !== examIndex);
    onUpdateData({ ...data, exams: updatedExams });
  };

  // Update specific finding properties
  const updateFinding = (examIndex: number, findingIndex: number, updatedFinding: Finding) => {
    const updatedExams = [...data.exams];
    const updatedFindings = [...updatedExams[examIndex].findings];
    updatedFindings[findingIndex] = updatedFinding;
    updatedExams[examIndex] = {
      ...updatedExams[examIndex],
      findings: updatedFindings,
    };
    onUpdateData({ ...data, exams: updatedExams });
  };

  // Add an empty finding to an exam
  const addFinding = (examIndex: number) => {
    const updatedExams = [...data.exams];
    const updatedFindings = [
      ...updatedExams[examIndex].findings,
      { label: "NovoCampo", value: "0" },
    ];
    updatedExams[examIndex] = {
      ...updatedExams[examIndex],
      findings: updatedFindings,
    };
    onUpdateData({ ...data, exams: updatedExams });
  };

  // Delete specific finding from an exam
  const deleteFinding = (examIndex: number, findingIndex: number) => {
    const updatedExams = [...data.exams];
    const updatedFindings = updatedExams[examIndex].findings.filter(
      (_, idx) => idx !== findingIndex
    );
    updatedExams[examIndex] = {
      ...updatedExams[examIndex],
      findings: updatedFindings,
    };
    onUpdateData({ ...data, exams: updatedExams });
  };

  // Add subitem nested detail (e.g. HT to Hb)
  const addSubItem = (examIndex: number, findingIndex: number) => {
    const updatedExams = [...data.exams];
    const targetFinding = updatedExams[examIndex].findings[findingIndex];
    const newSubItems = [...(targetFinding.subItems || []), { label: "Sub", value: "0" }];
    
    const updatedFindings = [...updatedExams[examIndex].findings];
    updatedFindings[findingIndex] = {
      ...targetFinding,
      subItems: newSubItems,
    };
    
    updatedExams[examIndex] = {
      ...updatedExams[examIndex],
      findings: updatedFindings,
    };
    onUpdateData({ ...data, exams: updatedExams });
  };

  // Delete nested subitem
  const deleteSubItem = (examIndex: number, findingIndex: number, subIndex: number) => {
    const updatedExams = [...data.exams];
    const targetFinding = updatedExams[examIndex].findings[findingIndex];
    if (!targetFinding.subItems) return;
    
    const newSubItems = targetFinding.subItems.filter((_, idx) => idx !== subIndex);
    const updatedFindings = [...updatedExams[examIndex].findings];
    updatedFindings[findingIndex] = {
      ...targetFinding,
      subItems: newSubItems,
    };
    
    updatedExams[examIndex] = {
      ...updatedExams[examIndex],
      findings: updatedFindings,
    };
    onUpdateData({ ...data, exams: updatedExams });
  };

  // Full-exam addition helper
  const addBlankExam = () => {
    const newExam: Exam = {
      category: "LAB",
      date: new Date().toLocaleDateString("pt-BR", { year: "2-digit", month: "2-digit", day: "2-digit" }),
      findings: [{ label: "Hb", value: "12", subItems: [{ label: "HT", value: "36%" }] }],
    };
    onUpdateData({
      ...data,
      exams: [...data.exams, newExam],
    });
  };
  // Theme styling dictionaries
  const isDark = settings.theme === "dark-emerald" || settings.theme === "midnight";
  
  const themeStyles = {
    light: {
      accentText: "text-blue-600",
      accentBg: "bg-blue-50/70",
      accentBorder: "border-blue-105",
      primaryBtn: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/10",
      ring: "focus:ring-blue-500 focus:border-blue-500",
      focusBorder: "focus:border-blue-500",
      pillBtn: "border-blue-200 bg-blue-50 hover:bg-blue-100/80 text-blue-700",
      outlineBtn: "border-dashed hover:border-blue-400 bg-slate-50 hover:bg-blue-50/10 text-slate-500 hover:text-blue-600",
      card: "bg-white border-slate-200",
      text: "text-slate-800",
      subText: "text-slate-400",
      input: "bg-slate-50 border-slate-300 text-slate-800",
      itemBg: "bg-slate-50 border-slate-150",
    },
    hospital: {
      accentText: "text-teal-600",
      accentBg: "bg-teal-50/70",
      accentBorder: "border-teal-105",
      primaryBtn: "bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/10",
      ring: "focus:ring-teal-500 focus:border-teal-500",
      focusBorder: "focus:border-teal-500",
      pillBtn: "border-teal-200 bg-teal-50 hover:bg-teal-100/80 text-teal-700",
      outlineBtn: "border-dashed hover:border-teal-400 bg-slate-50 hover:bg-teal-50/10 text-slate-500 hover:text-teal-600",
      card: "bg-white border-slate-200",
      text: "text-slate-800",
      subText: "text-slate-400",
      input: "bg-slate-50 border-slate-300 text-slate-800",
      itemBg: "bg-slate-50 border-slate-150",
    },
    emerald: {
      accentText: "text-emerald-600",
      accentBg: "bg-emerald-50/70",
      accentBorder: "border-emerald-105",
      primaryBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10",
      ring: "focus:ring-emerald-500 focus:border-emerald-500",
      focusBorder: "focus:border-emerald-500",
      pillBtn: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700",
      outlineBtn: "border-dashed hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/10 text-slate-500 hover:text-emerald-600",
      card: "bg-white border-slate-200",
      text: "text-slate-800",
      subText: "text-slate-400",
      input: "bg-slate-50 border-slate-300 text-slate-800",
      itemBg: "bg-slate-50 border-slate-150",
    },
    charcoal: {
      accentText: "text-slate-800",
      accentBg: "bg-slate-100",
      accentBorder: "border-slate-300",
      primaryBtn: "bg-slate-850 hover:bg-slate-900 text-white shadow-lg",
      ring: "focus:ring-slate-700 focus:border-slate-700",
      focusBorder: "focus:border-slate-700",
      pillBtn: "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800",
      outlineBtn: "border-dashed hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-850",
      card: "bg-white border-slate-200",
      text: "text-slate-800",
      subText: "text-slate-400",
      input: "bg-slate-100 border-slate-300 text-slate-800",
      itemBg: "bg-slate-50 border-slate-150",
    },
    "dark-emerald": {
      accentText: "text-emerald-400",
      accentBg: "bg-emerald-950/40",
      accentBorder: "border-emerald-900/50",
      primaryBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10",
      ring: "focus:ring-emerald-500 focus:border-emerald-500",
      focusBorder: "focus:border-emerald-500",
      pillBtn: "border-emerald-900/50 bg-emerald-950/50 hover:bg-emerald-900 text-emerald-400",
      outlineBtn: "border-dashed border-emerald-900/50 hover:border-emerald-500 bg-slate-950 hover:bg-emerald-950/30 text-slate-500 hover:text-emerald-400",
      card: "bg-slate-900 border-slate-800 shadow-xl shadow-black/20",
      text: "text-slate-100",
      subText: "text-slate-500",
      input: "bg-black border-slate-800 text-emerald-50",
      itemBg: "bg-slate-950 border-slate-800",
    },
    midnight: {
      accentText: "text-sky-400",
      accentBg: "bg-sky-950/40",
      accentBorder: "border-sky-900/50",
      primaryBtn: "bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-500/10",
      ring: "focus:ring-sky-500 focus:border-sky-500",
      focusBorder: "focus:border-sky-500",
      pillBtn: "border-sky-900/50 bg-sky-950/50 hover:bg-sky-900 text-sky-400",
      outlineBtn: "border-dashed border-sky-900/50 hover:border-sky-50 hover:border-sky-500 bg-black hover:bg-sky-950/30 text-slate-500 hover:text-sky-400",
      card: "bg-slate-950 border-slate-900 shadow-xl shadow-black/20",
      text: "text-slate-200",
      subText: "text-slate-500",
      input: "bg-black border-slate-900 text-sky-50",
      itemBg: "bg-black/60 border-slate-900",
    },
  }[settings.theme] || {
    accentText: "text-blue-600",
    accentBg: "bg-blue-50/70",
    accentBorder: "border-blue-105",
    primaryBtn: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/10",
    ring: "focus:ring-blue-500 focus:border-blue-500",
    focusBorder: "focus:border-blue-500",
    pillBtn: "border-blue-200 bg-blue-50 hover:bg-blue-100/80 text-blue-700",
    outlineBtn: "border-dashed hover:border-blue-400 bg-slate-50 hover:bg-blue-50/10 text-slate-500 hover:text-blue-600",
    card: "bg-white border-slate-200",
    text: "text-slate-800",
    subText: "text-slate-400",
    input: "bg-slate-50 border-slate-300 text-slate-800",
    itemBg: "bg-slate-50 border-slate-150",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 align-stretch">
      {/* LEFT COLUMN: EDITOR AND STRUCTURE VIEWS (60%) */}
      <div className="lg:col-span-3 space-y-6">
        {/* Patient header card */}
        <div className={`${themeStyles.card} rounded-2xl p-4 shadow-sm`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className={`w-9 h-9 rounded-lg ${themeStyles.accentBg} flex items-center justify-center ${themeStyles.accentText} border ${themeStyles.accentBorder}`}>
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className={`text-[10px] uppercase font-bold ${themeStyles.subText} tracking-wider`}>
                  Paciente:
                </span>
                {isEditingPatient ? (
                  <div className="flex items-center space-x-2 mt-0.5">
                    <input
                      id="input-patient-name"
                      type="text"
                      value={patientInput}
                      onChange={(e) => setPatientInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && savePatientName()}
                      className={`text-sm font-semibold px-2.5 py-1 ${themeStyles.input} rounded focus:outline-none focus:ring-1 ${themeStyles.ring} max-w-xs sm:max-w-md`}
                      autoFocus
                    />
                    <button
                      id="btn-save-patient"
                      onClick={savePatientName}
                      className={`px-3 py-1 font-bold text-xs rounded-lg transition-colors`}
                      style={{ backgroundColor: settings.accentTone, color: "white" }}
                    >
                      OK
                    </button>
                    <button
                      id="btn-cancel-patient"
                      onClick={() => {
                        setPatientInput(data.patientName);
                        setIsEditingPatient(false);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 mt-0.5 group">
                    <span className={`font-bold ${themeStyles.text} text-sm`}>
                      {data.patientName || "Não identificado"}
                    </span>
                    <button
                      id="btn-edit-patient"
                      onClick={() => setIsEditingPatient(true)}
                      className={`text-slate-400 hover:${themeStyles.accentText} p-0.5 rounded transition-transform`}
                      title="Editar nome"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              id="btn-add-blank-exam"
              onClick={addBlankExam}
              className={`inline-flex items-center space-x-1.5 border ${themeStyles.pillBtn} text-xs font-bold py-1.5 px-3 rounded-xl transition-all shadow-sm focus:ring-1 ${themeStyles.ring}`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Adicionar Exame</span>
            </button>
          </div>
        </div>

        {/* Exams cards grid */}
        {data.exams.length === 0 ? (
          <div className={`${isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"} rounded-2xl border border-dashed p-8 text-center ${themeStyles.subText}`}>
            Nenhum exame analisado ou todos foram deletados.
            <button
              onClick={addBlankExam}
              className={`block mx-auto mt-2 ${themeStyles.accentText} font-bold text-xs hover:underline`}
            >
              Criar um exame vazio para preenchimento manual
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {data.exams.map((exam, examIdx) => (
              <div
                key={examIdx}
                className={`${themeStyles.card} rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow relative overflow-hidden group`}
              >
                {/* Decorative category badge sidebar */}
                <div 
                  className="absolute top-0 bottom-0 left-0 w-1.5" 
                  style={{ backgroundColor: settings.accentTone }}
                />

                {/* Exam Card Header */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${isDark ? "border-slate-800" : "border-slate-100"} pb-3 mb-3`}>
                  <div className="flex items-center space-x-2.5">
                    {/* Select Category */}
                    <select
                      id={`select-category-${examIdx}`}
                      value={exam.category}
                      onChange={(e) => updateExamProps(examIdx, "category", e.target.value)}
                      className={`text-xs font-bold px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-1 ${themeStyles.ring} ${themeStyles.input} cursor-pointer`}
                    >
                      <option value="LAB">LAB (Geral)</option>
                      <option value="Sumário de urina">Sumário de Urina</option>
                      <option value="Gasometria arterial">Gasometria Arterial</option>
                      <option value="Gasometria venosa">Gasometria Venosa</option>
                      <option value="Outro">Outro (Personalizado)</option>
                    </select>

                    {/* Custom Title if 'Outro' */}
                    {exam.category === "Outro" && (
                      <input
                        id={`input-custom-title-${examIdx}`}
                        type="text"
                        placeholder="Nome do exame (ex: Líquor)"
                        value={exam.customTitle || ""}
                        onChange={(e) => updateExamProps(examIdx, "customTitle", e.target.value)}
                        className={`text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 ${themeStyles.ring} ${themeStyles.input}`}
                      />
                    )}
                  </div>

                  {/* Date and Delete operations */}
                  <div className="flex items-center space-x-2.5">
                    <div className={`flex items-center space-x-1 ${themeStyles.subText} text-xs`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <input
                        id={`input-exam-date-${examIdx}`}
                        type="text"
                        maxLength={8}
                        placeholder="DD/MM/YY"
                        value={exam.date}
                        onChange={(e) => updateExamProps(examIdx, "date", e.target.value)}
                        className={`w-20 font-mono font-bold px-2 py-1 rounded text-center focus:outline-none focus:ring-1 ${themeStyles.ring} ${themeStyles.input}`}
                        title="Formato DD/MM/YY"
                      />
                    </div>

                    <button
                      id={`btn-delete-exam-${examIdx}`}
                      onClick={() => deleteExam(examIdx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Excluir este exame do resultado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Exam Findings Editor */}
                <div className="space-y-3">
                  <div className={`text-[10px] uppercase font-bold tracking-wider ${themeStyles.subText} opacity-70`}>
                    Shorthand Items estruturados (Edição inline):
                  </div>

                  {exam.findings.map((finding, findIdx) => (
                    <div
                      key={findIdx}
                      className={`p-3 rounded-xl border flex flex-col space-y-2 ${themeStyles.itemBg}`}
                    >
                      {/* Main Finding Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            id={`input-finding-label-${examIdx}-${findIdx}`}
                            type="text"
                            value={finding.label}
                            onChange={(e) => {
                              const updatedFinding = { ...finding, label: e.target.value };
                              updateFinding(examIdx, findIdx, updatedFinding);
                            }}
                            onBlur={(e) => {
                              const newValue = e.target.value;
                              onSaveCorrection?.(finding.originalLabel || finding.label, newValue);
                            }}
                            placeholder="Hb"
                            className={`text-xs font-bold px-2.5 py-1 rounded focus:outline-none focus:ring-1 ${themeStyles.ring} w-24 ${themeStyles.input}`}
                          />
                          <input
                            id={`input-finding-value-${examIdx}-${findIdx}`}
                            type="text"
                            value={finding.value}
                            onChange={(e) => {
                              const updatedFinding = { ...finding, value: e.target.value };
                              updateFinding(examIdx, findIdx, updatedFinding);
                            }}
                            placeholder="Valor"
                            className={`text-xs px-2.5 py-1 rounded focus:outline-none focus:ring-1 ${themeStyles.ring} w-32 font-mono font-bold ${themeStyles.input}`}
                          />
                        </div>

                        {/* Finding Actions (SubItems / Trash) */}
                        <div className="flex items-center space-x-1.5">
                          <button
                            id={`btn-add-subitem-${examIdx}-${findIdx}`}
                            onClick={() => addSubItem(examIdx, findIdx)}
                            className={`inline-flex items-center px-1.5 py-0.5 text-[10px] ${themeStyles.pillBtn} font-bold rounded border`}
                            title="Adicionar detalhe entre colchetes (ex: HT, VCM)"
                          >
                            <Plus className="w-2.5 h-2.5 mr-0.5" />
                            + Sub
                          </button>
                          <button
                            id={`btn-delete-finding-${examIdx}-${findIdx}`}
                            onClick={() => deleteFinding(examIdx, findIdx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="Excluir item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Nesting Sub-Items (eg HT, VCM inside brackets list) */}
                      {finding.subItems && finding.subItems.length > 0 && (
                        <div className={`pl-4 border-l-2 py-1.5 space-y-2 rounded-r px-2.5 ${isDark ? "border-slate-800 bg-black/40" : "border-slate-200 bg-white/40"}`}>
                          <div className={`text-[10px] ${themeStyles.subText} font-bold lowercase tracking-wider opacity-60 mb-0.5`}>
                            sub-itens [ {finding.label} ]:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {finding.subItems.map((sub, subIdx) => (
                              <div
                                key={subIdx}
                                className={`flex items-center justify-between space-x-2 px-2.5 py-1.5 rounded border text-[11px] ${themeStyles.input}`}
                              >
                                <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                                  <input
                                    id={`input-subitem-label-${examIdx}-${findIdx}-${subIdx}`}
                                    type="text"
                                    value={sub.label}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      const newSubItems = [...(finding.subItems || [])];
                                      newSubItems[subIdx] = { ...newSubItems[subIdx], label: newValue };
                                      updateFinding(examIdx, findIdx, { ...finding, subItems: newSubItems });
                                    }}
                                    onBlur={(e) => {
                                      const newValue = e.target.value;
                                      onSaveCorrection?.(sub.originalLabel || sub.label, newValue);
                                    }}
                                    placeholder="HT"
                                    className={`w-14 px-1 bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none font-bold`}
                                  />
                                  <span className="opacity-30">:</span>
                                  <input
                                    id={`input-subitem-value-${examIdx}-${findIdx}-${subIdx}`}
                                    type="text"
                                    value={sub.value}
                                    onChange={(e) => {
                                      const newSubItems = [...(finding.subItems || [])];
                                      newSubItems[subIdx] = { ...newSubItems[subIdx], value: e.target.value };
                                      updateFinding(examIdx, findIdx, { ...finding, subItems: newSubItems });
                                    }}
                                    placeholder="30%"
                                    className={`w-24 px-1 bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none font-mono font-medium`}
                                  />
                                </div>
                                <button
                                  id={`btn-delete-subitem-${examIdx}-${findIdx}-${subIdx}`}
                                  onClick={() => deleteSubItem(examIdx, findIdx, subIdx)}
                                  className="text-slate-500 hover:text-rose-500 font-bold text-base leading-none"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Field Button */}
                  <button
                    id={`btn-add-finding-to-${examIdx}`}
                    onClick={() => addFinding(examIdx)}
                    className={`w-full py-2.5 border ${themeStyles.outlineBtn} rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center space-x-1.5 focus:ring-1 ${themeStyles.ring}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Campo no Exame</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: SYNTHESIZED PRONTUÁRIO VIEW (40%) - Sleek Interface style */}
      <div className="lg:col-span-2">
        <div className={`rounded-2xl shadow-xl sticky top-20 flex flex-col h-[calc(100vh-140px)] min-h-[450px] overflow-hidden border ${isDark ? "bg-slate-950 border-slate-900" : "bg-slate-900 border-slate-800"}`}>
          {/* Header of synthesized representation */}
          <div className={`p-4 border-b flex justify-between items-center shrink-0 ${isDark ? "bg-black/40 border-slate-900" : "bg-slate-800/40 border-slate-800"}`}>
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Resultado Transcrito (Prontuário)
              </h2>
            </div>
            {isSaved && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/80 px-2.5 py-0.5 rounded-full uppercase flex items-center">
                <CheckSquare className="w-2.5 h-2.5 mr-1 text-emerald-400" />
                Registrado
              </span>
            )}
          </div>

          {/* Sizing of findings: Deep terminal styled */}
          <div className={`flex-1 p-6 font-mono text-sm leading-relaxed overflow-y-auto whitespace-pre-wrap select-all focus:outline-none [color-scheme:dark] ${isDark ? "bg-black/60 text-emerald-400" : "bg-slate-900/90 text-green-400"}`}>
            {formattedOutput ? (
              formattedOutput
            ) : (
              <div className="text-slate-500 text-center flex flex-col items-center justify-center h-full">
                <FileText className="w-8 h-8 mb-3 text-slate-600 opacity-20" />
                <p className="font-semibold text-xs text-slate-400">Pronto para receber dados</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[180px] leading-relaxed mx-auto">
                  Adicione dados de exames à esquerda para ver a formatação do prontuário.
                </p>
              </div>
            )}
          </div>

          {/* Bottom helper card note */}
          <div className={`p-4 border-t space-y-2.5 shrink-0 ${isDark ? "bg-black border-slate-900" : "bg-slate-950/50 border-slate-800/80"}`}>
            <button
              id="btn-copy-prontuário"
              disabled={!formattedOutput}
              onClick={handleCopy}
              className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md ${
                formattedOutput
                  ? "text-white cursor-pointer hover:shadow-lg active:scale-[0.99]"
                  : "bg-slate-800 text-white/20 cursor-not-allowed border border-slate-700/60"
              }`}
              style={formattedOutput ? { backgroundColor: settings.accentTone } : {}}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white font-bold" />
                  <span>Copiado com Sucesso!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar para Área de Transferência</span>
                </>
              )}
            </button>

            <button
              id="btn-save-to-history"
              disabled={!formattedOutput}
              onClick={onSaveToHistory}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all ${
                formattedOutput
                  ? "bg-slate-800 text-slate-200 border-slate-700/80 hover:bg-slate-750 hover:border-slate-600 cursor-pointer text-center"
                  : "bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed"
              }`}
            >
              Arquivar e Atualizar no Histórico
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
