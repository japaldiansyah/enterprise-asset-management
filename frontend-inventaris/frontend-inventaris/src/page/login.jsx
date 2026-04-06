import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';
import Lottie from 'lottie-react';
import animationData from '../assets/Isometric data analysis.json'; 

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/login', {
                email: email.trim(),
                password
            });
            login(res.data.user, res.data.token);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Email atau Password salah!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-white flex flex-col md:flex-row font-['Inter'] overflow-x-hidden">
            
            {/* --- CSS ANIMATION (Fix: Menggunakan dangerouslySetInnerHTML untuk menghindari error JSX) --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes slideUp {
                    from { transform: translateY(80px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeInDesktop {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-custom-login {
                    animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @media (min-width: 768px) {
                    .animate-custom-login {
                        animation: fadeInDesktop 0.8s ease forwards;
                    }
                }
            `}} />

            {/* --- PANEL VISUAL --- */}
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
                <div className="relative z-10 w-full max-w-[160px] md:max-w-[400px] group ">
                    <div className="transition-all duration-700 ease-in-out group-hover:scale-105">
                        <Lottie 
                            animationData={animationData} 
                            loop={true}
                            style={{ width: '100%', height: 'auto' }}
                        />
                    </div>
                </div>

                <div className="absolute bottom-12 left-12 z-20 max-w-[280px] hidden md:block">
                    <p className="text-slate-900 font-extrabold text-lg leading-tight">
                        Efisiensi Manajemen Aset <br /> dalam Satu Sistem Terpadu.
                    </p>
                </div>
            </div>

            {/* --- PANEL FORM (SIZE & ROUNDED FIX) --- */}
            <div className="flex-1 flex items-start md:items-center justify-center bg-white p-8 md:p-12 lg:p-20 -mt-10 md:mt-0 relative z-30 rounded-t-[32px] md:rounded-none shadow-[0_-15px_30px_rgba(0,0,0,0.03)] md:shadow-none animate-custom-login">
                
                {/* Container lebih compact: max-w-[340px] */}
                <div className="w-full max-w-[330px]">
                    
                    <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-8 md:hidden"></div>

                    <div className="mb-8 text-center md:text-left">
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">
                            Selamat Datang!
                        </h1>
                        <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed">
                            Kelola semua aset Anda di satu tempat.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-[11px] font-semibold rounded-lg border border-red-100 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5">
                        <div className="relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none placeholder:text-slate-400"
                                placeholder="Email atau Username"
                                required
                            />
                        </div>

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none placeholder:text-slate-400"
                                placeholder="Kata Sandi"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        <div className="flex justify-end pr-1">
                            <Link to="/forgot-password"  className="text-[11px] font-bold text-slate-900 hover:text-blue-600 transition-colors">
                                Lupa Kata Sandi?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-3 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 active:scale-[0.99] transition-all shadow-lg shadow-blue-100"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Masuk"}
                        </button>
                    </form>

                    <footer className="mt-10 text-center text-[11px] text-slate-400 font-medium">
                        Butuh bantuan? <span className="text-blue-600 font-bold  underline">Hubungi Admin</span>
                    </footer>
                </div>
            </div>
        </div>
    );
}