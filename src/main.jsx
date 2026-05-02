import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import CSS Tailwind Anda
import './index.css'; 

// Import Halaman
import App from './App';
import MainContainer from './MainContainer';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Rute untuk Petugas Lapangan (Halaman Utama) */}
        <Route path="/" element={<App />} />
        
        {/* Rute untuk Admin BPS (Halaman Manajemen Aturan) */}
        <Route path="/admin/panel" element={<MainContainer />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);