import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// --- Wajib: Layout Utama ---
import DashboardLayout from "./layout/DashboardLayout";

// --- Halaman Publik (Akses Tanpa Login) ---
import Login from "./page/login";
import AccountActivation from "./page/AccountActivation"; // <<< BARU: Halaman Aktivasi

import ForgotPassword from "./page/ForgotPassword"; // Sesuaikan folder
import ResetPassword from "./page/ResetPassword";     // Sesuaikan folder

// --- Halaman Terlindungi (Akses Bersama/Admin) ---
import ProtectedRoute from "./components/ProtectedRoute"; 
import Dashboard from "./page/dashboard";
import Kategori from "./page/kategori";
import Lokasi from "./page/lokasi";
import PenanggungJawab from "./page/penanggungjawab";
import RiwayatTransferAset from "./page/mutasi";
import RiwayatServiceAsset from "./page/servisaset";
import ManajemenPeminjaman from "./page/peminjaman";

// --- Halaman Khusus Admin (Wajib Role: 'Admin') ---
import Barang from "./page/barang";
import ManajemenPenghapusanAsset from "./page/penghapusan";
import AdminInviteUser from "./page/AdminInviteUser"; 
import UserAuditLog from "./page/UserAuditLog";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ======================================================= */}
        {/* 1. RUTE PUBLIK (Akses Tanpa Token)                       */}
        {/* ======================================================= */}
        <Route path="/login" element={<Login />} /> 
        <Route path="/unauthorized" element={<h1>403: Akses Ditolak</h1>} />

              
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Rute untuk aktivasi akun baru (menggunakan token di URL) */}
        <Route path="/activate" element={<AccountActivation />} /> 

        
        {/* ======================================================= */}
        {/* 2. GRUP RUTE TERLINDUNGI (Wajib Login/Token Valid)       */}
        {/* ======================================================= */}
        {/* Menggunakan ProtectedRoute untuk memverifikasi token dan isLoading */}
        <Route element={<ProtectedRoute />}>
          
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} /> 
            <Route path="dashboard" element={<Dashboard />} /> 
            
            {/* --- 2.1. Rute Akses Bersama (Role: Semua/User/Staf/Admin) --- */}
            <Route path="Assets" element={<Barang />} />
            <Route path="AssetDisposal" element={<ManajemenPenghapusanAsset />} />
            <Route path="Categories" element={<Kategori />} />
            <Route path="Locations" element={<Lokasi/>} />
            <Route path="AssetOwner" element={<PenanggungJawab/>} />
            <Route path="AssetTransfers" element={<RiwayatTransferAset/>} />
            <Route path="AssetMaintenance" element={<RiwayatServiceAsset/>} />
            <Route path="AssetLoans" element={<ManajemenPeminjaman/>} />
            
            
            {/* ======================================================= */}
            {/* 3. SUB-GRUP RUTE KHUSUS ADMIN (Wajib Role: 'Admin')     */}
            {/* ======================================================= */}
            {/* Nested ProtectedRoute: Memastikan role 'Admin' saat sudah di dalam DashboardLayout */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} isNested={true} />}> 
                
                
                {/* Rute Undangan User (Provisioning) */}
                <Route path="Users" element={<AdminInviteUser />} /> 
                <Route path="AuditLogs" element={<UserAuditLog />} /> 
                
            </Route>

          </Route>
        </Route>

        {/* Opsional: Rute 404 (Harus diletakkan paling akhir) */}
        <Route path="*" element={<h1>404: Halaman Tidak Ditemukan</h1>} />
      </Routes>
    </BrowserRouter>
  );
}