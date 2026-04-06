import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig'; 
import { User, Lock, Eye, EyeOff, Loader2, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import Lottie from 'lottie-react';
import animationData from '../assets/Isometric data analysis.json'; 

function AccountActivation() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token'); 
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ 
        type: 'info', 
        text: 'Memverifikasi tautan aktivasi...' 
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!token) {
            setStatusMessage({ 
                type: 'error', 
                text: 'Tautan aktivasi tidak lengkap. Mohon periksa kembali email Anda.' 
            });
        } else {
            setStatusMessage({ 
                type: 'info', 
                text: 'Tautan terverifikasi. Silakan lengkapi data profil Anda.' 
            });
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setErrors({});

        try {
            const res = await api.post('/activate', {
                token: token,
                name: name.trim(),
                password: password,
                password_confirmation: passwordConfirmation, 
            });

            setStatusMessage({ 
                type: 'success', 
                text: res.data.message || 'Akun berhasil diaktifkan! Mengalihkan ke Login...' 
            });
            
            setTimeout(() => {
                navigate('/login', { replace: true });
            }, 3000);

        } catch (err) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            }
            setStatusMessage({ 
                type: 'error', 
                text: err.response?.data?.message || 'Gagal melakukan aktivasi akun.' 
            });
        } finally {
            setLoading(false);
        }
    };
    
    const showForm = token && statusMessage.type !== 'success';

    return (
        <div className="min-h-screen w-full bg-white flex flex-col md:flex-row font-['Inter'] overflow-x-hidden">
            
            {/* --- PANEL VISUAL (KONSISTEN) --- */}
            <div className="relative w-full md:w-[50%] lg:w-[55%] h-[30vh] md:h-screen bg-blue-50 flex items-center justify-center p-6 md:p-12 overflow-hidden">
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

                <div className="relative z-10 w-full max-w-[140px] md:max-w-[380px]">
                    <Lottie animationData={animationData} loop={true} style={{ width: '100%', height: 'auto' }} />
                </div>

                <div className="absolute bottom-12 left-12 z-20 max-w-[280px] hidden md:block">
                    <p className="text-slate-900 font-extrabold text-lg leading-tight">
                        Langkah Terakhir. <br /> Lengkapi profil untuk mulai mengelola aset.
                    </p>
                </div>
            </div>

            {/* --- PANEL FORM --- */}
            <div className="flex-1 flex items-start md:items-center justify-center bg-white p-8 md:p-12 lg:p-20 -mt-10 md:mt-0 relative z-30 rounded-t-[32px] md:rounded-none shadow-[0_-15px_30px_rgba(0,0,0,0.03)] md:shadow-none animate-custom-fade">
                
                <div className="w-full max-w-[340px]">
                    
                    <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-8 md:hidden"></div>

                    <div className="mb-6 text-center md:text-left">
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">
                            Aktivasi Akun
                        </h1>
                        <p className="text-slate-400 text-xs md:text-sm font-medium">
                            Silakan atur nama dan kata sandi Anda.
                        </p>
                    </div>

                    {/* Status Alert yang lebih mungil */}
                    <div className={`mb-6 p-3 rounded-xl border flex items-center gap-3 text-[11px] font-bold transition-all ${
                        statusMessage.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' :
                        statusMessage.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' :
                        'bg-blue-50 border-blue-100 text-blue-600'
                    }`}>
                        {statusMessage.type === 'error' ? <AlertCircle size={16} /> : 
                         statusMessage.type === 'success' ? <CheckCircle2 size={16} /> :
                         <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>}
                        {statusMessage.text}
                    </div>

                    {showForm && (
                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            {/* Input Nama */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <User size={16} />
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400 transition-all"
                                    placeholder="Nama Lengkap"
                                    required
                                />
                                {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.name[0]}</p>}
                            </div>

                            {/* Input Password */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400 transition-all"
                                    placeholder="Kata Sandi Baru"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                                {errors.password && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.password[0]}</p>}
                            </div>

                            {/* Input Konfirmasi Password */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={passwordConfirmation}
                                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400 transition-all"
                                    placeholder="Konfirmasi Kata Sandi"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 active:scale-[0.99] transition-all shadow-lg shadow-blue-100 disabled:bg-slate-300 mt-2"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    <>Aktifkan Akun <ArrowRight size={16} /></>
                                )}
                            </button>
                        </form>
                    )}

                    <div className="mt-8 text-center border-t border-slate-50 pt-6">
                        <p className="mt-10 text-center text-[11px] text-slate-400 font-medium">
                            sudah punya akun? <span> <Link to="/login" className="text-[11px] font-bold text-slate-400 hover:text-blue-600 transition-colors hover:underline">
                                    Login di sini
                                </Link>
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* --- CSS ANIMATION --- */}
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

export default AccountActivation;