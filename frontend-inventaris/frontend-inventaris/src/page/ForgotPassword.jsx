import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, Send } from 'lucide-react';
import api from '../api/axiosConfig'; 
import Lottie from 'lottie-react';
// Gunakan animasi yang sama atau senada agar konsisten secara brand
import animationData from '../assets/Isometric data analysis.json'; 

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const res = await api.post('/forgot-password', { email });
            setMessage(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Email tidak ditemukan.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-white flex flex-col md:flex-row font-['Inter'] overflow-x-hidden">
            
            {/* --- PANEL VISUAL (KONSISTEN DENGAN LOGIN) --- */}
            <div className="relative w-full md:w-[50%] lg:w-[55%] h-[35vh] md:h-screen bg-blue-50 flex items-center justify-center p-6 md:p-12 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-64 md:w-[500px] h-64 md:h-[500px] bg-blue-100 rounded-full blur-[80px] md:blur-[120px] opacity-60"></div>
                
                <div className="absolute top-0 right-0 h-full w-24 fill-white hidden md:block">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                        <path d="M100 0 C 40 30, 60 70, 100 100 Z" />
                    </svg>
                </div>

                {/* Branding */}
                <div className="absolute top-8 md:top-12 left-1/2 -translate-x-1/2 md:left-12 md:translate-x-0 z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 md:w-2 md:h-8 bg-blue-600 rounded-full"></div>
                        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
                            NASA <span className="text-blue-600 not-italic">ASSETS</span>
                        </h2>
                    </div>
                </div>

                {/* Lottie Animation */}
                <div className="relative z-10 w-full max-w-[160px] md:max-w-[400px]">
                    <Lottie 
                        animationData={animationData} 
                        loop={true}
                        style={{ width: '100%', height: 'auto' }}
                    />
                </div>

                <div className="absolute bottom-12 left-12 z-20 max-w-[280px] hidden md:block">
                    <p className="text-slate-900 font-extrabold text-lg leading-tight">
                        Keamanan Akun Prioritas Kami. <br /> Pulihkan akses Anda sekarang.
                    </p>
                </div>
            </div>

            {/* --- PANEL FORM (SLIDE UP & COMPACT) --- */}
            <div className="flex-1 flex items-start md:items-center justify-center bg-white p-8 md:p-12 lg:p-20 -mt-10 md:mt-0 relative z-30 rounded-t-[32px] md:rounded-none shadow-[0_-15px_30px_rgba(0,0,0,0.03)] md:shadow-none animate-custom-fade">
                
                <div className="w-full max-w-[340px]">
                    
                    <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-8 md:hidden"></div>

                    <div className="mb-8 text-center md:text-left">
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">
                            Lupa Password?
                        </h1>
                        <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed">
                            Masukkan email terdaftar untuk mendapatkan instruksi reset.
                        </p>
                    </div>

                    {message && (
                        <div className="mb-4 p-3 bg-green-50 text-green-700 text-[11px] font-semibold rounded-lg border border-green-100 text-center animate-pulse">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-[11px] font-semibold rounded-lg border border-red-100 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none placeholder:text-slate-400"
                                placeholder="nama@perusahaan.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 active:scale-[0.99] transition-all shadow-lg shadow-blue-100 disabled:bg-slate-300"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Send size={14} /> Kirim Link Reset
                                </>
                            )}
                        </button>

                        <div className="pt-2">
                            <Link 
                                to="/login" 
                                className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-colors group"
                            >
                                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
                                Kembali ke Login
                            </Link>
                        </div>
                    </form>
                </div>
            </div>

            {/* --- CSS ANIMATION (Clean Fix) --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes slideUp {
                    from { transform: translateY(80px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeInDesktop {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-custom-fade {
                    animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @media (min-width: 768px) {
                    .animate-custom-fade {
                        animation: fadeInDesktop 0.8s ease forwards;
                    }
                }
            `}} />
        </div>
    );
}