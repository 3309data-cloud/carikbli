import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/api";

export default function SynonymManager() {
  const [synonyms, setSynonyms] = useState([]);
  const [filteredSynonyms, setFilteredSynonyms] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [selectedId, setSelectedId] = useState(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [synonymList, setSynonymList] = useState([{ word: "", weight: 0.5 }]);

  // ==========================================
  // 1. DATA FETCHING
  // ==========================================
  const fetchSynonyms = useCallback(async () => {
    const { data, error } = await supabase
      .from('synonyms')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error("❌ Error fetching synonyms:", error);
      return;
    }
    setSynonyms(data || []);
    setFilteredSynonyms(data || []);
  }, []);

  useEffect(() => {
    fetchSynonyms();
  }, [fetchSynonyms]);

  // ==========================================
  // 2. LIVE SEARCH LOGIC (Client-Side)
  // ==========================================
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSynonyms(synonyms);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase().trim();
    const filtered = synonyms.filter(item => {
      // Cek apakah match di Keyword Utama
      const matchKeyword = item.keyword?.toLowerCase().includes(lowerQuery);
      
      // Cek apakah match di dalam JSON array Sinonimnya
      let matchSynonym = false;
      try {
        const parsed = typeof item.synonym === 'string' ? JSON.parse(item.synonym) : item.synonym;
        if (Array.isArray(parsed)) {
          matchSynonym = parsed.some(s => s.word?.toLowerCase().includes(lowerQuery));
        }
      } catch (e) {
        matchSynonym = false;
      }

      return matchKeyword || matchSynonym;
    });

    setFilteredSynonyms(filtered);
  }, [searchQuery, synonyms]);

  // ==========================================
  // 3. MODAL & ROW ACTIONS
  // ==========================================
  const openModal = (item = null) => {
    if (item) {
      setSelectedId(item.id);
      setKeywordInput(item.keyword);
      try {
        const parsed = typeof item.synonym === 'string' ? JSON.parse(item.synonym) : item.synonym;
        setSynonymList(Array.isArray(parsed) ? parsed : [{ word: "", weight: 0.5 }]);
      } catch (e) {
        setSynonymList([{ word: "", weight: 0.5 }]);
      }
    } else {
      setSelectedId(null);
      setKeywordInput("");
      setSynonymList([{ word: "", weight: 0.5 }]);
    }
    setIsModalOpen(true);
  };

  const addSynonymRow = () => {
    setSynonymList([...synonymList, { word: "", weight: 0.5 }]);
  };

  const removeSynonymRow = (index) => {
    setSynonymList(synonymList.filter((_, i) => i !== index));
  };

  const updateSynonymRow = (index, field, value) => {
    const newList = [...synonymList];
    newList[index][field] = field === 'weight' ? parseFloat(value) : value;
    setSynonymList(newList);
  };

  const saveChanges = async () => {
    if (!keywordInput || isProcessing) return;
    setIsProcessing(true);

    const finalSynonyms = synonymList.filter(s => s.word.trim() !== "");
    const payload = {
      keyword: keywordInput,
      synonym: JSON.stringify(finalSynonyms)
    };

    try {
      if (selectedId) {
        await supabase.from('synonyms').update(payload).eq('id', selectedId);
      } else {
        await supabase.from('synonyms').insert([payload]);
      }
      
      await supabase.from('app_metadata').update({ value: Date.now().toString() }).eq('key', 'db_version');
      
      setIsModalOpen(false);
      fetchSynonyms();
    } catch (err) {
      console.error("❌ Save Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus grup sinonim ini?")) return;
    await supabase.from('synonyms').delete().eq('id', id);
    fetchSynonyms();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER */}
        <header className="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-10 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Synonym Engine</h1>
            <p className="text-xs font-bold text-slate-400 mt-0.5">Pusat Kendali Perluasan Kata Kunci • SE2026</p>
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-blue-600 shadow-lg shadow-blue-200 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700 active:scale-95"
          >
            + Tambah Sinonim
          </button>
        </header>

        {/* UTILITY BAR (SEARCH & STATS) */}
        <div className="bg-white border-b border-slate-100 px-10 py-4 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
          <div className="relative w-full sm:w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </span>
            <input 
              type="text"
              placeholder="Cari kata kunci atau sinonim..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-4 py-2 rounded-lg">
            Total Terdisplay: <span className="text-blue-600 font-mono text-xs">{filteredSynonyms.length}</span> / {synonyms.length} Grup
          </div>
        </div>

{/* DENSE TABLE SECTION - HIGH CONTRAST HIERARCHY */}
<div className="flex-1 overflow-y-auto p-10 bg-slate-100/40">
  <div className="max-w-7xl mx-auto space-y-3">
    
    {/* TABLE HEADER REPLACEMENT */}
    <div className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl px-8 py-4 grid grid-cols-12 gap-4 shadow-sm">
      <div className="col-span-7">Keywords Pokok (Kata Umum Lapangan)</div>
      <div className="col-span-3">Target Ekspansi Spesifik & Bobot AI</div>
      <div className="col-span-2 text-center">Aksi Kendali</div>
    </div>

    {/* TABLE BODY (ROW BASED) */}
    <div className="space-y-3">
      {filteredSynonyms.map((item, index) => {
        let parsedSyns = [];
        try {
          parsedSyns = typeof item.synonym === 'string' ? JSON.parse(item.synonym || "[]") : (item.synonym || []);
          if (!Array.isArray(parsedSyns)) parsedSyns = [];
        } catch (e) {
          parsedSyns = [];
        }

        return (
          <div 
            key={item.id} 
            className={`grid grid-cols-12 gap-4 items-center px-8 py-5 rounded-2xl border transition-all duration-150 group bg-white ${
              index % 2 === 0 
                ? 'border-slate-200/80 shadow-sm' 
                : 'bg-slate-50/50 border-slate-200/50 shadow-sm'
            } hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-md`}
          >
            {/* 1. KOLOM KEYWORD POKOK (Kiri - Banyak & Umum) */}
            <div className="col-span-7 pr-4">
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-thin">
                {item.keyword?.split(',').map((k, i) => (
                  <span 
                    key={i} 
                    className="bg-slate-200/60 text-slate-600 text-[9px] font-bold px-2.5 py-1 rounded-md tracking-wide uppercase border border-slate-300/40"
                  >
                    {k.trim()}
                  </span>
                ))}
              </div>
            </div>

            {/* 2. KOLOM EXPANDED RESULTS (Tengah - Spesifik & Berbobot) */}
            <div className="col-span-3 border-l border-dashed border-slate-200 pl-6">
              <div className="flex flex-wrap gap-2">
                {parsedSyns.length > 0 ? parsedSyns.map((s, i) => (
                  <div 
                    key={i} 
                    className="inline-flex items-center bg-blue-50 border-2 border-blue-100 rounded-xl px-3 py-1.5 gap-2.5 shadow-sm hover:border-blue-300 transition-colors"
                  >
                    <span className="text-xs font-black text-blue-950 tracking-tight">{s.word}</span>
                    <span 
                      className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-md shadow-inner ${
                        s.weight >= 0.8 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {s.weight.toFixed(1)}
                    </span>
                  </div>
                )) : (
                  <span className="text-xs italic text-slate-400">Tidak ada sinonim spesifik</span>
                )}
              </div>
            </div>

            {/* 3. KOLOM AKSI (Kanan) */}
            <div className="col-span-2 text-center">
              <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <button 
                  onClick={() => openModal(item)} 
                  className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-md"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(item.id)} 
                  className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="Hapus Grup"
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>

          </div>
        );
      })}

      {filteredSynonyms.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400 italic text-xs font-bold shadow-sm">
          Tidak ada data grup sinonim yang cocok dengan pencarian Anda.
        </div>
      )}
    </div>

  </div>
</div>
      </main>

      {/* MODAL EDITOR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-150">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Editor Sinonim Metadata</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-8">
              <div className="mb-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Grup Kata Kunci Utama (Pisah Koma)</label>
                <input 
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Contoh: warung, kedai, warmindo"
                  className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-xl px-5 py-3 text-xs font-bold text-slate-700 outline-none transition-all"
                />
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-end mb-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Daftar Ekspansi & Bobot Algoritma</label>
                  <button onClick={addSynonymRow} className="text-[10px] font-black text-blue-600 uppercase hover:underline">+ Tambah Baris Kata</button>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {synonymList.map((row, idx) => (
                    <div key={idx} className="flex gap-3 items-center animate-in fade-in slide-in-from-top-1 duration-100">
                      <input 
                        type="text"
                        value={row.word}
                        onChange={(e) => updateSynonymRow(idx, 'word', e.target.value)}
                        placeholder="Masukkan Kata Sinonim..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-slate-400"
                      />
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                        <span className="text-[10px] font-mono font-black text-blue-600 w-8">W: {row.weight.toFixed(1)}</span>
                        <input 
                          type="range" min="0.1" max="1" step="0.1"
                          value={row.weight}
                          onChange={(e) => updateSynonymRow(idx, 'weight', e.target.value)}
                          className="w-20 accent-blue-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <button onClick={() => removeSynonymRow(idx)} className="text-slate-300 hover:text-red-500 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 border-t border-slate-100 pt-6">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Batal</button>
                <button 
                  onClick={saveChanges}
                  disabled={isProcessing || !keywordInput.trim()}
                  className="flex-[2] bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-30 shadow-md"
                >
                  {isProcessing ? "Menyimpan Data..." : "Simpan Grup Sinonim"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}