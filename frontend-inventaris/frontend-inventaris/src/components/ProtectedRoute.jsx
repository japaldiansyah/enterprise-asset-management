// src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Panggil Context yang baru

const ProtectedRoute = ({ allowedRoles, isNested = false }) => {
    
    const { user, isAuthenticated, isLoading } = useAuth(); 

    // 1. TAHAP KRITIS: LOADING STATE
    if (isLoading) {
        // Tampilkan loading/spinner untuk MENGHINDARI BLANK WHITE SCREEN
        return (
             <div style={{ padding: '20px', textAlign: 'center', fontSize: '18px' }}>
                 Memverifikasi sesi...
             </div>
        ); 
    }

    // 2. Cek Token Autentikasi (Setelah Loading Selesai)
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    
    // 3. Cek Otorisasi Role (RBAC)
    const userRole = user?.role; 

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        if (isNested) {
            // Jika rute bersarang, tampilkan error di dalam layout
            return <h1>403: Akses Ditolak (Hanya untuk Admin)</h1>;
        }
        return <Navigate to="/unauthorized" replace />;
    }

    // 4. Render Rute Bersarang
    return <Outlet />;
};

export default ProtectedRoute;