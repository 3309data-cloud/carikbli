import { useState } from "react";
import Sidebar from "./components/Sidebar";
import AdminPanel from "./pages/AdminPanel";
import FeedbackManager from "./pages/FeedbackManager";
import AdminKbliManager from "./pages/AdminKbliManager";

export default function MainContainer() {
  const [activeTab, setActiveTab] = useState('keyword');

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
      {/* Sidebar dipanggil di sini, mengontrol state activeTab */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeTab === 'keyword' ? <AdminPanel /> : activeTab === 'feedback' ? <FeedbackManager /> : <AdminKbliManager />}
      </main>
    </div>
  );
}