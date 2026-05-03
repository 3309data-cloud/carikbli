import { supabase } from "./services/api";
import { useState, useEffect } from "react";
import AdminPanel from "./pages/AdminPanel";
import FeedbackManager from "./pages/FeedbackManager";
import AdminKbliManager from "./pages/AdminKbliManager";
import Sidebar from "./components/Sidebar";
import SynonymManager from "./pages/SynonymManager";

export default function MainContainer() {
  const [activeTab, setActiveTab] = useState(localStorage.getItem("adminTab") || "keyword");
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentVersion, setCurrentVersion] = useState("...");

  useEffect(() => {
    localStorage.setItem("adminTab", activeTab);
    fetchCurrentVersion();
  }, [activeTab]);

  // Ambil versi saat ini untuk ditampilkan
  const fetchCurrentVersion = async () => {
    const { data } = await supabase
      .from('app_metadata')
      .select('value')
      .eq('key', 'db_version')
      .single();
    if (data) setCurrentVersion(data.value);
  };

  const handlePushUpdate = async () => {
    if (!window.confirm(`Push update ke semua petugas? (Versi saat ini: ${currentVersion})`)) return;
    
    setIsUpdating(true);
    try {
      // 1. Ambil versi terakhir dari Supabase
      const { data, error } = await supabase
        .from('app_metadata')
        .select('value')
        .eq('key', 'db_version')
        .single();

      if (error) throw error;

      // 2. Logika increment versi (1.0.000 -> 1.0.001)
      const versionParts = data.value.split('.');
      const lastPart = versionParts.pop(); // Mengambil "000"
      const nextNumber = parseInt(lastPart) + 1;
      
      // Kembalikan ke format padding 3 digit (001, 002, dst)
      const newLastPart = nextNumber.toString().padStart(3, '0');
      const newVersion = [...versionParts, newLastPart].join('.');

      // 3. Update kembali ke Supabase
      const { error: updateError } = await supabase
        .from('app_metadata')
        .update({ value: newVersion })
        .eq('key', 'db_version');

      if (updateError) throw updateError;

      setCurrentVersion(newVersion);
      alert(`🚀 Berhasil! Versi sekarang: ${newVersion}. Petugas akan segera menerima update.`);
    } catch (err) {
      console.error("Gagal update versi:", err);
      alert("Gagal melakukan push update.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const TAB_COMPONENTS = {
    keyword: <AdminPanel />,
    feedback: <FeedbackManager />,
    kbli: <AdminKbliManager />,
    synonym: <SynonymManager />,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="p-4 flex justify-end items-center gap-4 bg-white border-b shadow-sm">
          {/* Info Versi & Tombol Push Update */}
          <div className="flex items-center gap-2 border-r pr-4 border-slate-100">
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Database Version</p>
              <p className="text-xs font-black text-blue-600 leading-none">{currentVersion}</p>
            </div>
            <button 
              onClick={handlePushUpdate}
              disabled={isUpdating}
              className={`ml-2 p-2 rounded-lg transition-all active:scale-90 ${
                isUpdating ? 'bg-slate-100' : 'bg-blue-50 hover:bg-blue-600 group'
              }`}
              title="Push Update ke Petugas"
            >
              <svg 
                className={`w-4 h-4 ${isUpdating ? 'text-slate-400 animate-spin' : 'text-blue-600 group-hover:text-white'}`} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="text-[10px] font-black text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all tracking-widest"
          >
            LOGOUT
          </button>
        </div>

        {TAB_COMPONENTS[activeTab]}
      </main>
    </div>
  );
}