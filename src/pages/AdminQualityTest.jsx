import { supabase } from "../services/api";
import React, { useState, useEffect } from 'react';
import { 
  Play, CheckCircle, XCircle, Trash2, Edit3, Plus, 
  Save, X, Beaker, RefreshCw, Database, Info, AlertTriangle, Target, Activity
} from 'lucide-react';
import { performInferenceManual } from '../utils/inferenceLogic';

export default function AdminQualityTest({ data, isLoadingAppData }) {
  const [goldenDataset, setGoldenDataset] = useState([]);
  const [testResults, setTestResults] = useState({});
  const [isTesting, setIsTesting] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({ query: '', expected_kode: '', expected_nama: '', category: 'Umum' });

  useEffect(() => {
    fetchGoldenData();
  }, []);

  const fetchGoldenData = async () => {
    try {
      const { data: ds, error } = await supabase
        .from('golden_dataset')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGoldenDataset(ds || []);
    } catch (err) {
      console.error("❌ Gagal load Golden Dataset:", err.message);
    }
  };

  // --- FUNGSI EDIT YANG DITAMBAHKAN KEMBALI ---
  const startEdit = (item) => {
    setIsEditing(item.id);
    setFormData({ 
      query: item.query, 
      expected_kode: item.expected_kode, 
      expected_nama: item.expected_nama || '', 
      category: item.category || 'Umum' 
    });
    // Scroll ke atas otomatis agar user melihat form edit
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveData = async () => {
    if (!formData.query || !formData.expected_kode) return alert("Query dan Kode wajib diisi!");
    try {
      if (isEditing) {
        await supabase.from('golden_dataset').update(formData).eq('id', isEditing);
      } else {
        await supabase.from('golden_dataset').insert([formData]);
      }
      setFormData({ query: '', expected_kode: '', expected_nama: '', category: 'Umum' });
      setIsEditing(null);
      fetchGoldenData();
    } catch (err) {
      alert("Gagal menyimpan data: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Hapus data ujian ini?")) {
      await supabase.from('golden_dataset').delete().eq('id', id);
      fetchGoldenData();
    }
  };

  const runFullTest = async () => {
    const kbliData = data?.kbli || [];
    if (kbliData.length === 0) return alert("Database KBLI lokal kosong.");

    setIsTesting(true);
    const resultsMap = {};
    let passed = 0;

    try {
      for (const test of goldenDataset) {
        const inference = performInferenceManual(test.query, data);
        const candidates = inference?.finalResults || [];
        const top30Kodes = candidates.map(c => c.kode);
        const rankIndex = top30Kodes.indexOf(test.expected_kode);
        const rank = rankIndex !== -1 ? rankIndex + 1 : null;
        
        const topRes = inference?.topResult;
        const actualKode = topRes?.kode || "N/A";
        const actualNama = topRes?.nama || "Tidak ditemukan";
        const isPassed = actualKode === test.expected_kode;

        // Ambil nama target untuk tampilan
        const targetObj = kbliData.find(k => k.kode === test.expected_kode);
        const targetNama = targetObj ? targetObj.nama : "Nama tidak ditemukan";

        let stepLog = "";
        if (isPassed) {
          stepLog = `Peringkat #1 (${Math.round(inference.confidence)}%)`;
          passed++;
        } else if (rank !== null) {
          stepLog = `Rank #${rank}, kalah skor dari ${actualKode}`;
        } else {
          stepLog = `Tidak ditemukan di 30 kandidat awal.`;
        }

        resultsMap[test.id] = {
          actual_kode: actualKode,
          actual_nama: actualNama,
          target_nama: targetNama,
          status: isPassed ? 'PASSED' : (rank ? 'IN_TOP_30' : 'MISS'),
          rank: rank || '—',
          confidence: Math.round(inference?.confidence || 0),
          log: stepLog
        };
      }

      setTestResults(resultsMap);
      setLastRun({ 
        total: goldenDataset.length, 
        passed, 
        accuracy: ((passed / goldenDataset.length) * 100).toFixed(1) 
      });
    } catch (err) {
      console.error("Crash:", err);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoadingAppData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="animate-spin text-indigo-600 mb-3" size={32} />
        <p className="text-sm font-black text-slate-400 uppercase">Sync KBLI...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
      {/* STICKY CONTROL HEADER */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white">
              <Beaker size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 italic uppercase leading-none">Accuracy Lab</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                KBLI: {data?.kbli?.length.toLocaleString()} | Total Case: {goldenDataset.length}
              </p>
            </div>
          </div>

          {lastRun && (
            <div className="flex items-center gap-6 bg-slate-900 text-white px-6 py-2 rounded-2xl shadow-lg border border-slate-700">
              <div className="text-center">
                <p className="text-[8px] font-black opacity-50 uppercase tracking-tighter">Accuracy Score</p>
                <p className="text-xl font-black text-indigo-400">{lastRun.accuracy}%</p>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-center">
                <p className="text-[8px] font-black opacity-50 uppercase tracking-tighter">Passed Cases</p>
                <p className="text-xl font-black">{lastRun.passed}/{lastRun.total}</p>
              </div>
            </div>
          )}

          <button 
            onClick={runFullTest} 
            disabled={isTesting || goldenDataset.length === 0}
            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-slate-300 shadow-md shadow-indigo-100"
          >
            {isTesting ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
            {isTesting ? "MENGANALISIS..." : "RUN FULL TEST"}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Quick Input Form */}
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block ml-1">Input Petugas</label>
              <input type="text" placeholder="Query pencarian..." value={formData.query} onChange={e => setFormData({...formData, query: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 ring-indigo-50 outline-none" />
            </div>
            <div className="w-32">
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block ml-1">Target Kode</label>
              <input type="text" placeholder="KBLI" value={formData.expected_kode} onChange={e => setFormData({...formData, expected_kode: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:ring-2 ring-indigo-50 outline-none" />
            </div>
            <div className="w-32">
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block ml-1">Kategori</label>
              <input type="text" placeholder="Umum" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 ring-indigo-50 outline-none" />
            </div>
            <button onClick={handleSaveData} className="bg-slate-800 text-white p-2.5 rounded-xl font-bold text-xs hover:bg-indigo-600 transition-all flex items-center gap-2">
              {isEditing ? <Save size={16}/> : <Plus size={16}/>}
              {isEditing ? "UPDATE" : "SIMPAN"}
            </button>
            {isEditing && (
              <button onClick={() => {setIsEditing(null); setFormData({query:'', expected_kode:'', expected_nama:'', category:'Umum'})}} className="bg-slate-200 text-slate-500 p-2.5 rounded-xl transition-all hover:bg-slate-300"><X size={16}/></button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Input & Target</th>
                  {Object.keys(testResults).length > 0 && (
                    <>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4">Engine Output</th>
                      <th className="p-4">Alur Analisis</th>
                    </>
                  )}
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {goldenDataset.map((item, idx) => {
                  const result = testResults[item.id];
                  return (
                    <tr 
                      key={item.id} 
                      className={`border-t border-slate-50 group transition-all ${
                        result?.status === 'PASSED' ? 'bg-green-50/20' : 
                        result?.status === 'IN_TOP_30' || result?.status === 'MISS' ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <td className="p-4 text-center font-bold text-slate-300">{idx + 1}</td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700 italic leading-tight">"{item.query}"</p>
                        <div className="flex flex-col mt-1">
                          <span className="text-[10px] font-mono text-indigo-500 font-bold uppercase tracking-tighter">
                            Target: {item.expected_kode}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[220px] font-medium" title={result?.target_nama}>
                            {result?.target_nama || "—"}
                          </span>
                        </div>
                      </td>

                      {result && (
                        <>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-sm ${
                              result.status === 'PASSED' ? 'bg-green-600' : 
                              result.status === 'MISS' ? 'bg-red-600' : 'bg-orange-500'
                            }`}>
                              {result.status === 'PASSED' ? 'LULUS' : 
                               result.status === 'MISS' ? 'FATAL' : `RANK #${result.rank}`}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className={`font-mono font-black text-xs ${
                                  result.status === 'PASSED' ? 'text-green-600' : 'text-red-500'
                                }`}>
                                  {result.actual_kode}
                                </span>
                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                                  {result.confidence}% Conf
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 truncate max-w-[220px] font-medium" title={result.actual_nama}>
                                {result.actual_nama}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 max-w-xs">
                            <div className="flex items-start gap-1.5 opacity-80">
                              {result.status === 'PASSED' ? 
                                <CheckCircle size={12} className="text-green-500 mt-0.5 shrink-0"/> : 
                                <AlertTriangle size={12} className="text-orange-400 mt-0.5 shrink-0"/>
                              }
                              <p className="text-[10px] text-slate-500 leading-tight font-medium">
                                {result.log}
                              </p>
                            </div>
                          </td>
                        </>
                      )}

                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEdit(item)} 
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Kasus"
                          >
                            <Edit3 size={14}/>
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)} 
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Kasus"
                          >
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}