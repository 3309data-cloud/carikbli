import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/api";
import { cleanQuery } from "../utils/textProcessor";

export default function AdminPanel() {
  // --- STATES ---
  const [settings, setSettings] = useState({ learning_mode: 'manual', min_threshold: 5 });
  const [suggestions, setSuggestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ total: 0, ready: 0 });

  // States untuk Modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pickedWords, setPickedWords] = useState([]);

  // --- DATA FETCHING ---
  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase.from('app_settings').select('*');
    if (error) return;
    const s = {};
    data.forEach(item => s[item.key] = item.value);
    setSettings(prev => ({ ...prev, ...s }));
  }, []);

  const fetchSuggestions = useCallback(async () => {
    const [
      { data: suggestionData, error: sugError },
      { data: kbliData, error: kbliError }
    ] = await Promise.all([
      // Mengambil usulan dari view (pastikan view v_keyword_suggestions menyertakan kolom is_checked)
      supabase
        .from('v_keyword_suggestions')
        .select('*')
        .order('is_checked', { ascending: true }) // false (0) naik ke atas
        .order('frekuensi', { ascending: false }), // frekuensi tinggi di atas
      supabase.from('master_kbli').select('kode, nama, uraian, keyword') 
    ]);

    if (sugError || kbliError) {
      console.error("❌ Error fetching data:", sugError || kbliError);
      return;
    }

    const list = (suggestionData || []).map(sug => {
      const detail = kbliData?.find(k => k.kode === sug.selected_kode);
      return {
        ...sug,
        master_kbli: detail || { nama: "Tidak ditemukan", uraian: "-", keyword: "" }
      };
    });

    setSuggestions(list);
    const threshold = parseInt(settings.min_threshold);
    setStats({
      total: list.length,
      ready: list.filter(item => item.frekuensi >= threshold).length
    });
  }, [settings.min_threshold]);

  useEffect(() => {
    fetchSettings();
    fetchSuggestions();
  }, [fetchSettings, fetchSuggestions]);

  // --- LOGIC HANDLERS ---
  const toggleMode = async () => {
    const newMode = settings.learning_mode === 'frequency' ? 'manual' : 'frequency';
    const { error } = await supabase.from('app_settings').update({ value: newMode }).eq('key', 'learning_mode');
    if (!error) setSettings(prev => ({ ...prev, learning_mode: newMode }));
  };

  const openApprovalModal = (item) => {
    setSelectedItem(item);
    const currentWords = [...new Set(cleanQuery(item.raw_query).split(' '))];
    
    // Ambil keyword yang sudah ada di database untuk KBLI ini
    const existingKeywords = item.master_kbli?.keyword 
      ? item.master_kbli.keyword.split(',').map(k => k.trim().toLowerCase()) 
      : [];

    // Otomatis centang kata yang sudah ada di DB
    const alreadyPresent = currentWords.filter(word => 
      existingKeywords.includes(word.toLowerCase())
    );

    setPickedWords(alreadyPresent); 
    setIsModalOpen(true);
  };

  const finalizeApprove = async () => {
    if (pickedWords.length === 0 || isProcessing) return;
    setIsProcessing(true);

    try {
      const { data: kbliData } = await supabase
        .from('master_kbli')
        .select('keyword')
        .eq('kode', selectedItem.selected_kode)
        .single();

      const existing = kbliData?.keyword 
        ? kbliData.keyword.split(',').map(k => k.trim().toLowerCase()) 
        : [];
      
      const merged = [...new Set([...existing, ...pickedWords.map(w => w.toLowerCase())])].join(', ');

      // 1. Update Master KBLI
      await supabase.from('master_kbli').update({ keyword: merged }).eq('kode', selectedItem.selected_kode);
      
      // 2. Tandai log sebagai SUDAH DICEK (agar baris jadi hijau permanen)
      await supabase.from('training_logs')
        .update({ is_checked: true })
        .eq('raw_query', selectedItem.raw_query)
        .eq('selected_kode', selectedItem.selected_kode);

      setIsModalOpen(false);
      fetchSuggestions(); 
    } catch (err) {
      console.error("❌ Finalize Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (rawQuery, kodeKbli) => {
    if (!window.confirm(`Abaikan "${rawQuery}"?`)) return;
    setIsProcessing(true);
    try {
      // Reject berarti sudah diproses tapi tidak dimasukkan ke database master
      await supabase.from('training_logs').update({ is_processed: true }).eq('raw_query', rawQuery).eq('selected_kode', kodeKbli);
      fetchSuggestions();
    } catch (err) {
      console.error("❌ Reject Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <header className="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-10">
            <div>
              <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Keyword Training</h1>
              <p className="text-xs font-bold text-slate-400 mt-0.5">Pengelola Keyword dari Masukan Petugas</p>
            </div>
            <div className="flex items-center gap-8 border-l pl-10 border-slate-100">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</p>
                  <p className="text-xl font-black text-slate-700 leading-none">{stats.total}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-green-500 uppercase tracking-widest leading-none mb-1">Siap</p>
                  <p className="text-xl font-black text-green-600 leading-none">{stats.ready}</p>
                </div>
            </div>
          </div>
          <button onClick={toggleMode} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 ${settings.learning_mode === 'frequency' ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'}`}>Mode: {settings.learning_mode}</button>
        </header>

        {/* Table Area */}
        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-widest text-xs">
                  <th className="px-8 py-5">Input & Status</th>
                  <th className="px-8 py-5">Detail KBLI</th>
                  <th className="px-8 py-5 text-center">Freq</th>
                  <th className="px-8 py-5 text-right pr-12">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suggestions.map((item, idx) => {
                  const currentWords = cleanQuery(item.raw_query).split(' ');
                  const dbKeywords = item.master_kbli?.keyword?.split(',').map(k => k.trim().toLowerCase()) || [];
                  const hasNewWord = currentWords.some(word => !dbKeywords.includes(word.toLowerCase()));

                  return (
                    <tr key={idx} className={`transition-all group ${item.is_checked ? 'bg-green-50/50' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-black text-slate-700 leading-snug">"{item.raw_query}"</p>
                          <div className="flex items-center gap-2">
                            {item.is_checked ? (
                              <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter flex items-center gap-1.5 border border-green-200">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                Sudah Cek
                              </span>
                            ) : hasNewWord ? (
                              <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter border border-orange-200 text-xs">New Keyword</span>
                            ) : (
                              <span className="bg-slate-100 text-slate-400 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter text-xs">Existing Match</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-tighter uppercase">KBLI {item.selected_kode}</span>
                          <span className="text-sm font-black text-slate-800 uppercase line-clamp-1">{item.master_kbli.nama}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic line-clamp-2 max-w-[400px] leading-relaxed">{item.master_kbli.uraian}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg font-black text-xs ${item.frekuensi >= settings.min_threshold ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-400 text-xs'}`}>
                          {item.frekuensi}x
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right pr-12">
                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleReject(item.raw_query, item.selected_kode)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Abaikan"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
                          <button onClick={() => openApprovalModal(item)} className="bg-white border-2 border-slate-900 text-slate-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95 text-xs">Approve</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {suggestions.length === 0 && (
              <div className="p-32 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Antrean Bersih - Sensus Terkendali</div>
            )}
          </div>
        </div>
      </main>

      {/* --- MODAL KURASI --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 border border-white/20">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase leading-none tracking-tighter">Kurasi Keyword</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase">KBLI {selectedItem?.selected_kode} - {selectedItem?.master_kbli?.nama}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-white p-2 rounded-full shadow-sm text-slate-400 hover:text-red-500 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-10">
              <div className="bg-slate-100/50 p-6 rounded-3xl border border-slate-200/50 text-sm text-slate-600 mb-8 italic relative">
                <span className="absolute -top-3 left-6 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest italic shadow-lg">Input Petugas</span>
                "{selectedItem?.raw_query}"
              </div>

              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tandai Kata Kunci Baru:</p>
              <div className="flex flex-wrap gap-2.5 mb-10">
                {[...new Set(cleanQuery(selectedItem?.raw_query).split(' '))].map(word => {
                  const isExistingInDb = selectedItem?.master_kbli?.keyword?.split(',').map(k => k.trim().toLowerCase()).includes(word.toLowerCase());
                  return (
                    <button
                      key={word}
                      onClick={() => setPickedWords(prev => prev.includes(word) ? prev.filter(w => w !== word) : [...prev, word])}
                      className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all border-2 flex items-center gap-2 ${pickedWords.includes(word) ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200" : "bg-white border-slate-200 text-slate-500 hover:border-blue-400"}`}
                    >
                      {word} 
                      {isExistingInDb ? (
                        <span className="text-[8px] bg-blue-400 text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter italic shadow-sm">DB</span>
                      ) : (
                        <span>{pickedWords.includes(word) ? '✓' : '+'}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="bg-blue-50 p-5 rounded-[30px] border border-blue-100 mb-10">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Pratinjau Gabungan:</p>
                <p className="text-sm font-black text-blue-700 leading-tight">{pickedWords.join(', ') || '-'}</p>
              </div>

              <div className="flex gap-4 font-black uppercase text-xs">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-xs">Batal</button>
                <button onClick={finalizeApprove} disabled={pickedWords.length === 0 || isProcessing} className="flex-[2] bg-slate-900 text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-2xl shadow-slate-300 disabled:opacity-30 text-xs">Simpan Perubahan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}