// src/api/axiosConfig.js

import axios from 'axios';

// PASTIKAN INI SAMA DENGAN APP_URL DI .ENV LARAVEL
const API_BASE_URL = `https://inventaris-be.tunggalika.com/api`; 

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Interceptor Request: Tambahkan Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken'); 

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor Response: Tangani 401 Unauthorized secara global
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("Sesi berakhir atau token tidak valid. Membersihkan sesi.");
            localStorage.removeItem('authToken');
            localStorage.removeItem('userRole'); 
            // Paksa navigasi ke halaman login
            window.location.href = '/login'; 
        }
        
        return Promise.reject(error);
    }
);

export default api;