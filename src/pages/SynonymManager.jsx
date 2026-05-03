import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/api";

export default function SynonymManager() {
  const [synonyms, setSynonyms] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [selectedId, setSelectedId] = useState(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [synonymList, setSynonymList] = useState([{ word: "", weight: 0.5 }]);

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
  }, []);

  useEffect(() => {
    fetchSynonyms();
  }, [fetchSynonyms]);

  const openModal = (item = null) => {
    if (item) {
      setSelectedId(item.id);
      setKeywordInput(item.keyword);
      try {
        // Safety check untuk parsing saat buka modal
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
      
      // Update Version agar petugas terupdate otomatis
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
        <header className="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-10 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Synonym Engine</h1>
            <p className="text-xs font-bold text-slate-400 mt-0.5">Pengatur Bobot & Perluasan Kata Kunci</p>
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-blue-600 shadow-lg shadow-blue-200 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-95"
          >
            + Tambah Sinonim
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {synonyms.map((item) => {
              // --- PERBAIKAN KRUSIAL DI SINI ---
              let parsedSyns = [];
              try {
                parsedSyns = typeof item.synonym === 'string' ? JSON.parse(item.synonym || "[]") : (item.synonym || []);
                if (!Array.isArray(parsedSyns)) parsedSyns = [];
              } catch (e) {
                parsedSyns = [];
              }

              return (
                <div key={item.id} className="bg-white rounded-[32px] border border-slate-200 shadow-xl p-8 flex flex-col h-full group hover:border-blue-400 transition-all">
                  <div className="mb-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {item.keyword?.split(',').map((k, i) => (
                        <span key={i} className="bg-slate-100 text-slate-700 text-[10px] font-black px-3 py-1 rounded-lg border border-slate-200">
                          {k.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Expanded Results & Weights</p>
                    <div className="space-y-2">
                      {parsedSyns.length > 0 ? parsedSyns.map((s, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <span className="text-sm font-black text-slate-700">{s.word}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${s.weight >= 0.8 ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            w-{s.weight}
                          </span>
                        </div>
                      )) : (
                        <p className="text-xs italic text-slate-400">Tidak ada sinonim tambahan</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => openModal(item)} className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-blue-600 active:scale-95">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="p-3 text-slate-300 hover:text-red-500 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* MODAL EDITOR TETAP SAMA SEPERTI KODE ANDA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Editor Sinonim</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-10">
              <div className="mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Grup Kata Kunci (Pisah Koma)</label>
                <input 
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Contoh: semangka, blewah, melon"
                  className="w-full bg-slate-100 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 outline-none transition-all"
                />
              </div>

              <div className="mb-8">
                <div className="flex justify-between items-end mb-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Daftar Ekspansi & Bobot</label>
                  <button onClick={addSynonymRow} className="text-[10px] font-black text-blue-600 uppercase">+ Tambah Kata</button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {synonymList.map((row, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <input 
                        type="text"
                        value={row.word}
                        onChange={(e) => updateSynonymRow(idx, 'word', e.target.value)}
                        placeholder="Sinonim..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                      />
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                        <span className="text-[10px] font-black text-slate-400">W: {row.weight}</span>
                        <input 
                          type="range" min="0.1" max="1" step="0.1"
                          value={row.weight}
                          onChange={(e) => updateSynonymRow(idx, 'weight', e.target.value)}
                          className="w-20 accent-blue-600"
                        />
                      </div>
                      <button onClick={() => removeSynonymRow(idx)} className="text-slate-300 hover:text-red-500 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Batal</button>
                <button 
                  onClick={saveChanges}
                  disabled={isProcessing || !keywordInput}
                  className="flex-[2] bg-slate-900 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-30 shadow-xl"
                >
                  {isProcessing ? "Menyimpan..." : "Simpan Metadata Sinonim"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}