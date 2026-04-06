// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!user;

    // Verifikasi Token saat aplikasi pertama kali dimuat
    useEffect(() => {
        const verifyToken = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await api.get('/user');
                setUser(response.data);
            } catch (error) {
                console.error("Token verification failed:", error);
                localStorage.clear();
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        verifyToken();
    }, []);

    // Fungsi Login: Dipanggil dari Login.jsx
    const login = (userData, token) => {
        setIsLoading(true); // Mulai loading untuk sinkronisasi state
        
        localStorage.setItem('authToken', token);
        localStorage.setItem('userRole', userData.role);
        localStorage.setItem('userName', userData.name || 'User');
        
        setUser(userData);
        setIsLoading(false); // Selesai update state
    };

    // Fungsi Logout: Menghapus semua sisa sesi
    const logout = () => {
        localStorage.clear();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};