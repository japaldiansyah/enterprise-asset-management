import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
// Import config api Anda
import api from '../api/axiosConfig'; 

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setError(null);

        try {
            // Menggunakan instance 'api' agar interceptor & baseURL terbawa
            const res = await api.post('/reset-password', {
                token, 
                email: email?.trim(), // Keamanan tambahan seperti di login
                password, 
                password_confirmation: passwordConfirmation
            });
            
            // Pola sukses yang konsisten
            setSuccess(true);
            
            // Berikan jeda agar user bisa membaca pesan sukses
            setTimeout(() => navigate('/login', { replace: true }), 3000);

        } catch (err) {
            console.error("Reset Password Error:", err);
            // Menangkap pesan error dari backend (Laravel/Node)
            setError(err.response?.data?.message || 'Gagal mereset password. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-['Inter']">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
            
            <div className="w-full max-w-[450px]">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 mb-4">
                        <ShieldCheck size={28} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Atur Password</h1>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Buat password baru yang aman untuk akun Anda.</p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
                    {success ? (
                        <div className="text-center py-4 animate-in fade-in zoom-in duration-300">
                            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-slate-900">Berhasil!</h2>
                            <p className="text-slate-500 text-sm mt-2">Password Anda telah diperbarui. Mengalihkan ke halaman login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg animate-in slide-in-from-top-1">
                                    {error}
                                </div>
                            )}
                            
                            <div className="p-3 bg-blue-50 rounded-xl text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-4 text-center">
                                Mereset password untuk: <span className="text-blue-900">{email}</span>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Password Baru</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm transition-all focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Min. 8 karakter"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Konfirmasi Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={passwordConfirmation}
                                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm transition-all focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Ulangi password"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-[0.98] disabled:bg-slate-400 shadow-lg shadow-blue-100"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    "Simpan Password Baru"
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}