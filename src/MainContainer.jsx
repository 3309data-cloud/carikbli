import { supabase } from "./services/api";
import { useState, useEffect } from "react";
// 1. Import Hook Data
import { useKbliData } from "./hooks/useKbliData"; 

import AdminPanel from "./pages/AdminPanel";
import FeedbackManager from "./pages/FeedbackManager";
import AdminKbliManager from "./pages/AdminKbliManager";
import Sidebar from "./components/Sidebar";
import SynonymManager from "./pages/SynonymManager";
import AdminQualityTest from "./pages/AdminQualityTest";

export default function MainContainer() {
  const [activeTab, setActiveTab] = useState(localStorage.getItem("adminTab") || "keyword");
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentVersion, setCurrentVersion] = useState("...");

  // 2. Inisialisasi Hook di sini
  const { data: appData, isLoading: isLoadingKbli } = useKbliData();

  useEffect(() => {
    localStorage.setItem("adminTab", activeTab);
    fetchCurrentVersion();
  }, [activeTab]);

  const fetchCurrentVersion = async () => {
    const { data } = await supabase
      .from('app_metadata')
      .select('value')
      .eq('key', 'db_version')
      .single();
    if (data) setCurrentVersion(data.value);
  };

const handlePushUpdate = async () => {
    // 1. Cegah eksekusi ganda jika proses sedang berjalan atau versi belum siap
    if (isUpdating || currentVersion === "...") return;

    setIsUpdating(true);

    try {
      // 2. Pecah string versi berdasarkan titik (contoh: "1", "00", "000")
      const versionParts = currentVersion.split('.');
      
      if (versionParts.length !== 3) {
        throw new Error("Format versi database tidak valid.");
      }

      const major = versionParts[0];
      const minor = versionParts[1];
      const patchStr = versionParts[2];

      // 3. Ubah bagian patch menjadi angka dan tambahkan 1
      const newPatchNum = parseInt(patchStr, 10) + 1;

      // 4. Validasi batas maksimal (999)
      if (newPatchNum > 999) {
        alert("Versi patch telah mencapai batas maksimal (999)!");
        setIsUpdating(false);
        return;
      }

      // 5. Format kembali ke 3 digit string (contoh: 1 -> "001", 12 -> "012")
      const newPatchStr = String(newPatchNum).padStart(3, '0');
      const newVersion = `${major}.${minor}.${newPatchStr}`;

      // 6. Update ke database Supabase
      const { error } = await supabase
        .from('app_metadata')
        .update({ value: newVersion })
        .eq('key', 'db_version');

      if (error) throw error;

      // 7. Update state lokal agar UI langsung berubah
      setCurrentVersion(newVersion);
      alert(`Berhasil memperbarui database ke versi ${newVersion}`);

    } catch (error) {
      console.error("Gagal melakukan push update:", error.message);
      alert("Terjadi kesalahan saat memperbarui versi database.");
    } finally {
      // 8. Matikan efek loading / animasi spin
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // 3. Masukkan data ke dalam komponen yang membutuhkan
  const renderContent = () => {
    switch (activeTab) {
      case "keyword": return <AdminPanel />;
      case "feedback": return <FeedbackManager />;
      case "kbli": return <AdminKbliManager />;
      case "synonym": return <SynonymManager />;
      case "admintest": 
        return (
          <AdminQualityTest 
            data={appData} 
            isLoadingAppData={isLoadingKbli} 
          />
        );
      default: return <AdminPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="p-4 flex justify-end items-center gap-4 bg-white border-b shadow-sm">
          {/* Info Versi & Logout Section */}
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
            >
               <svg className={`w-4 h-4 ${isUpdating ? 'text-slate-400 animate-spin' : 'text-blue-600 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <button onClick={handleLogout} className="text-[10px] font-black text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all tracking-widest">
            LOGOUT
          </button>
        </div>

        {/* 4. Render menggunakan fungsi agar props ter-update */}
        <div className="flex-1 overflow-auto">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}