import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import './index.css'; 
import App from './App';
import MainContainer from './MainContainer';
import Login from './pages/Login'; // ✅ Buat halaman login sederhana
import ProtectedRoute from './ProtectedRoute'; // ✅ Import satpamnya

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        
        {/* Rute Login */}
        <Route path="/login" element={<Login />} />
        
        {/* Rute Admin yang diproteksi */}
        <Route 
          path="/admin/panel" 
          element={
            <ProtectedRoute>
              <MainContainer />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);