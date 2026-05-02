import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/api";

export default function AdminKbliManager() {
    // ==========================================
    // 1. STATE MANAGEMENT
    // ==========================================
    const [kode, setKode] = useState("");
    const [nama, setNama] = useState("");
    const [uraian, setUraian] = useState("");
    const [keyword, setKeyword] = useState("");

    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const [existingRules, setExistingRules] = useState([]);
    const [masterDimensions, setMasterDimensions] = useState([]);
    const [masterOptions, setMasterOptions] = useState([]);

    const [selectedDimension, setSelectedDimension] = useState("");
    const [selectedValue, setSelectedValue] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [newDim, setNewDim] = useState({
        kode_dimensi: "",
        label: "",
        pertanyaan: "",
        opsi: ""
    });

    const [isAddingOption, setIsAddingOption] = useState(false);
    const [newOptionName, setNewOptionName] = useState("");

    // ==========================================
    // 2. INITIALIZATION
    // ==========================================
    const fetchMasterData = useCallback(async () => {
        const [{ data: dims }, { data: opts }] = await Promise.all([
            supabase.from("dimensions").select("*"),
            supabase.from("options").select("*")
        ]);
        setMasterDimensions(dims || []);
        setMasterOptions(opts || []);
    }, []);

    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    // ==========================================
    // 3. LIVE DETECTION ENGINE
    // ==========================================
    useEffect(() => {
        if (kode.length < 4) {
            resetFormTeks();
            setIsEditMode(false);
            setExistingRules([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const { data: kbliData } = await supabase
                    .from("master_kbli")
                    .select("*")
                    .eq("kode", kode)
                    .maybeSingle();

                if (kbliData) {
                    setIsEditMode(true);
                    setNama(kbliData.nama || "");
                    setUraian(kbliData.uraian || "");
                    setKeyword(kbliData.keyword || "");

                    const { data: rulesData } = await supabase
                        .from("rules")
                        .select("*, dimensions(label)")
                        .eq("kode", kode);

                    setExistingRules(rulesData || []);
                    showMessage("info", "KBLI Terdeteksi di Database.");
                } else {
                    setIsEditMode(false);
                    resetFormTeks();
                    setExistingRules([]);
                    showMessage("success", "KBLI Baru siap didaftarkan.");
                }
            } catch (error) {
                console.error("Cek KBLI Error:", error);
            } finally {
                setIsLoading(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [kode]);

    function resetFormTeks() {
        setNama("");
        setUraian("");
        setKeyword("");
    }

    function showMessage(type, text) {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    }

    // ==========================================
    // 4. LOGIKA HANDLERS
    // ==========================================
    async function handleSaveMaster() {
        if (!kode || !nama) return showMessage("error", "Kode dan Nama wajib diisi!");
        setIsLoading(true);
        try {
            const { error } = await supabase.from("master_kbli").upsert({
                kode, nama, uraian, keyword
            });
            if (error) throw error;
            setIsEditMode(true);
            showMessage("success", "Data Master KBLI berhasil disimpan!");
        } catch (error) {
            showMessage("error", "Gagal menyimpan: " + error.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleAddRule() {
        if (!kode || !selectedDimension || !selectedValue) return showMessage("error", "Pilih Dimensi dan Jawaban!");
        if (!isEditMode) return showMessage("error", "Simpan Master KBLI dulu!");

        setIsLoading(true);
        try {
            const dimLabel = masterDimensions.find(d => d.dimension === selectedDimension)?.label;
            await supabase.from("rules").insert({
                kode: kode,
                dimension: selectedDimension,
                answer: selectedValue,
                score: 30,
                explanation: `Klasifikasi ${dimLabel} - ${selectedValue}`
            });

            showMessage("success", "Aturan berhasil disematkan!");
            setSelectedDimension("");
            setSelectedValue("");

            const { data: rulesData } = await supabase
                .from("rules")
                .select("*, dimensions(label)")
                .eq("kode", kode);
            setExistingRules(rulesData || []);
        } catch (error) {
            showMessage("error", "Gagal: " + error.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCreateNewDimension() {
        if (!newDim.kode_dimensi || !newDim.label || !newDim.pertanyaan || !newDim.opsi) return;
        setIsLoading(true);
        try {
            const formatDimensi = newDim.kode_dimensi.toLowerCase().replace(/\s+/g, '_');
            const qId = `q_${formatDimensi}`;
            await supabase.from("dimensions").insert({
                dimension: formatDimensi, label: newDim.label, priority: 5, input_type: "radio"
            });
            await supabase.from("questions").insert({
                id: qId, question: newDim.pertanyaan, dimension: formatDimensi
            });
            const optionsArray = newDim.opsi.split(",").map(o => o.trim()).filter(o => o);
            const optsDataToInsert = optionsArray.map(optLabel => ({
                question_id: qId, label: optLabel, value: optLabel.toLowerCase()
            }));
            await supabase.from("options").insert(optsDataToInsert);

            await fetchMasterData();
            setShowModal(false);
            setSelectedDimension(formatDimensi);
            setNewDim({ kode_dimensi: "", label: "", pertanyaan: "", opsi: "" });
            showMessage("success", "Dimensi Baru tercipta!");
        } catch (error) {
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleAddNewOption() {
        if (!newOptionName.trim()) return;
        setIsLoading(true);
        try {
            const qId = masterOptions.find(o => o.question_id === `q_${selectedDimension}` || o.question_id === selectedDimension)?.question_id || `q_${selectedDimension}`;
            const { error } = await supabase.from("options").insert({
                question_id: qId, label: newOptionName.trim(), value: newOptionName.trim().toLowerCase()
            });
            if (error) throw error;
            await fetchMasterData();
            showMessage("success", "Jawaban baru ditambahkan!");
            setSelectedValue(newOptionName.trim().toLowerCase());
            setNewOptionName("");
            setIsAddingOption(false);
        } catch (error) {
            showMessage("error", error.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* SIDEBAR PLACEHOLDER (To match previous pages) */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* NAVBAR */}
                <header className="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-10 shadow-sm">
                    <div>
                        <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">KBLI Knowledge Manager</h1>
                        <p className="text-xs font-bold text-slate-400 mt-0.5">Sensus Ekonomi 2026 - Pusat Aturan AI</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {message.text && (
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-right-4 ${message.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {message.text}
                            </div>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-10 space-y-8">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                        
                        {/* PANEL KIRI: INFO DASAR */}
                        <div className="xl:col-span-5 space-y-6">
                            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
                                <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px]">01</span>
                                        Informasi Dasar KBLI
                                    </h2>
                                </div>
                                <div className="p-8 space-y-5">
                                    <div className="relative">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Kode KBLI</label>
                                        <input
                                            type="text" value={kode} onChange={(e) => setKode(e.target.value)}
                                            placeholder="Masukkan 5 digit kode..."
                                            className={`w-full bg-slate-50 border-2 rounded-2xl px-5 py-4 text-lg font-black text-slate-700 outline-none transition-all focus:ring-4 focus:ring-blue-100 ${isEditMode ? 'border-blue-400 bg-blue-50/30' : 'border-slate-100 focus:border-slate-300'}`}
                                        />
                                        {isLoading && <div className="absolute right-4 bottom-4 animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />}
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nama KBLI</label>
                                        <input
                                            type="text" value={nama} onChange={(e) => setNama(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:border-slate-300 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Keyword (Tags)</label>
                                        <input
                                            type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                                            placeholder="contoh: menanam, panen, sawah"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:border-slate-300 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Uraian / Deskripsi</label>
                                        <textarea
                                            rows="4" value={uraian} onChange={(e) => setUraian(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:border-slate-300 transition-all leading-relaxed"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSaveMaster} disabled={isLoading}
                                        className="w-full bg-slate-900 text-white font-black uppercase text-xs tracking-[0.2em] py-5 rounded-2xl shadow-2xl shadow-slate-200 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isEditMode ? "Perbarui Master Data" : "Daftarkan KBLI Baru"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* PANEL KANAN: MANAJEMEN DIMENSI */}
                        <div className="xl:col-span-7 space-y-6">
                            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
                                <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px]">02</span>
                                        Logika & Dimensi AI
                                    </h2>
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="text-[10px] font-black uppercase bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                                    >
                                        + Buat Dimensi Baru
                                    </button>
                                </div>

                                <div className="p-8">
                                    <div className="bg-slate-50 p-8 rounded-[32px] border-2 border-dashed border-slate-200 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Pilih Dimensi</label>
                                                <select
                                                    value={selectedDimension}
                                                    onChange={(e) => setSelectedDimension(e.target.value)}
                                                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none"
                                                >
                                                    <option value="">-- Dimensi --</option>
                                                    {masterDimensions.map(d => (
                                                        <option key={d.dimension} value={d.dimension}>{d.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {selectedDimension && (
                                                <div className="animate-in fade-in slide-in-from-top-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Opsi Jawaban</label>
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={selectedValue}
                                                            onChange={(e) => setSelectedValue(e.target.value)}
                                                            className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none"
                                                        >
                                                            <option value="">-- Value --</option>
                                                            {masterOptions
                                                                .filter(o => o.question_id === `q_${selectedDimension}` || o.question_id === selectedDimension || o.dimension === selectedDimension)
                                                                .map((o, idx) => (
                                                                    <option key={idx} value={o.value}>{o.label}</option>
                                                                ))}
                                                        </select>
                                                        <button
                                                            onClick={() => setIsAddingOption(!isAddingOption)}
                                                            className={`p-4 rounded-2xl transition-all shadow-md ${isAddingOption ? 'bg-red-500 text-white shadow-red-200' : 'bg-white text-slate-400 border-2 border-slate-100 hover:border-slate-300'}`}
                                                        >
                                                            {isAddingOption ? '✕' : '+'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {isAddingOption && (
                                            <div className="flex gap-3 p-5 bg-blue-600 rounded-2xl animate-in zoom-in-95 shadow-xl shadow-blue-100">
                                                <input
                                                    type="text" placeholder="Masukkan jawaban baru..."
                                                    value={newOptionName} onChange={e => setNewOptionName(e.target.value)}
                                                    className="flex-1 bg-blue-500 border-none rounded-xl px-4 text-white placeholder:text-blue-200 font-bold outline-none"
                                                />
                                                <button
                                                    onClick={handleAddNewOption}
                                                    className="bg-white text-blue-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-50 transition-all"
                                                >
                                                    Simpan
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleAddRule} disabled={!isEditMode || isLoading}
                                            className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-95 ${!isEditMode
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                                : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
                                            }`}
                                        >
                                            {!isEditMode ? "Tentukan KBLI Terlebih Dahulu" : "+ Terapkan Aturan"}
                                        </button>
                                    </div>

                                    {/* ATURAN AKTIF */}
                                    <div className="mt-10 space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Aturan Aktif pada Kode Ini</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {existingRules.map(rule => (
                                                <div key={rule.id} className="bg-white border-2 border-slate-100 p-5 rounded-[24px] flex justify-between items-center group hover:border-blue-200 transition-all shadow-sm">
                                                    <div className="min-w-0">
                                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">
                                                            {rule.dimensions?.label || rule.dimension}
                                                        </div>
                                                        <div className="text-sm font-black text-slate-800 uppercase truncate">{rule.answer}</div>
                                                    </div>
                                                    <div className="bg-green-100 text-green-600 text-[10px] font-black px-3 py-1 rounded-lg">
                                                        +{rule.score}
                                                    </div>
                                                </div>
                                            ))}
                                            {existingRules.length === 0 && (
                                                <div className="col-span-full py-10 text-center text-slate-300 font-bold italic text-xs border-2 border-dashed border-slate-100 rounded-[32px]">
                                                    Belum ada logika dimensi yang disematkan.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* MODAL: BUAT DIMENSI BARU */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-xl uppercase tracking-tight italic">Inject New Dimension</h3>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Struktur Logika AI Baru</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="bg-slate-800 w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-500 transition-all font-bold">✕</button>
                        </div>

                        <div className="p-10 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">ID Dimensi</label>
                                    <input type="text" placeholder="skala_modal"
                                        value={newDim.kode_dimensi} onChange={e => setNewDim({ ...newDim, kode_dimensi: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Label UI</label>
                                    <input type="text" placeholder="Skala Modal"
                                        value={newDim.label} onChange={e => setNewDim({ ...newDim, label: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Pertanyaan Chatbot</label>
                                <input type="text" placeholder="Berapa modal awalnya?"
                                    value={newDim.pertanyaan} onChange={e => setNewDim({ ...newDim, pertanyaan: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Opsi Jawaban (Koma Separator)</label>
                                <textarea rows="2" placeholder="Kecil, Menengah, Besar"
                                    value={newDim.opsi} onChange={e => setNewDim({ ...newDim, opsi: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none resize-none leading-relaxed" />
                            </div>

                            <button
                                onClick={handleCreateNewDimension} disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest py-5 rounded-[24px] shadow-2xl shadow-blue-200 mt-4 transition-all active:scale-95"
                            >
                                {isLoading ? "Synchronizing..." : "Initialize Dimension"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}