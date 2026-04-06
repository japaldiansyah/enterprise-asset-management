import { useState, useEffect } from "react"; // <--- Tambah useEffect
import { X, Save, TrendingUp, AlertCircle, Calendar, DollarSign, Clock, Calculator } from "lucide-react";
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';

export default function RevaluationModal({ barang, onClose, onSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        tanggal_revaluasi: new Date().toISOString().split('T')[0],
        nilai_baru: "",
        sisa_umur_tahun: "", // Nanti ini akan terisi otomatis
        keterangan: "",
    });

    // --- FITUR BARU: AUTO CALCULATE SISA UMUR ---
    useEffect(() => {
        if (barang) {
            let sisaHitungan = 0;
            const ONE_YEAR_IN_DAYS = 365;

            // Cek apakah ada history revaluasi? (Pastikan backend mengirim relasi 'revaluations')
            // Kita urutkan manual jaga-jaga kalau dari backend belum urut
            const sortedRevals = barang.revaluations 
                ? [...barang.revaluations].sort((a, b) => new Date(b.tanggal_revaluasi) - new Date(a.tanggal_revaluasi))
                : [];

            const latestReval = sortedRevals.length > 0 ? sortedRevals[0] : null;

            if (latestReval) {
                // --- SKENARIO A: SUDAH PERNAH REVALUASI ---
                // Basisnya adalah Sisa Umur yang diinput terakhir kali
                const basisUmur = parseInt(latestReval.sisa_umur_baru || 0);
                
                // Hitung hari yang berlalu SEJAK revaluasi terakhir
                const tglRevalTerakhir = new Date(latestReval.tanggal_revaluasi);
                const hariIni = new Date();
                const diffTime = Math.abs(hariIni - tglRevalTerakhir);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                // Kurangi basis dengan waktu yang sudah berjalan sejak saat itu
                const tahunBerjalan = diffDays / ONE_YEAR_IN_DAYS;
                sisaHitungan = basisUmur - tahunBerjalan;

            } else {
                // --- SKENARIO B: BELUM PERNAH (MURNI DARI AWAL) ---
                // Basisnya adalah Kategori
                const basisUmur = parseInt(barang.kategori?.masa_manfaat_tahun || 5);
                
                // Pakai umur_hari dari controller (Total sejak beli)
                const tahunBerjalan = (barang.umur_hari || 0) / ONE_YEAR_IN_DAYS;
                
                sisaHitungan = basisUmur - tahunBerjalan;
                
                console.log("Mode Perdana:", { basis: basisUmur, tahunBerjalan, hasil: sisaHitungan });
            }

            // Validasi & Format
            if (sisaHitungan < 0) sisaHitungan = 0;
            
            // Kita pakai toFixed(1) agar lebih presisi untuk tester yang revaluasi di hari yang sama
            // Contoh: Reval pagi sisa 5 thn. Reval sore (selisih 0 hari) -> Tetap 5.0
            const sisaFinal = sisaHitungan.toFixed(1).replace('.0', ''); // Hilangkan .0 jika bulat

            setFormData(prev => ({
                ...prev,
                sisa_umur_tahun: sisaFinal
            }));
        }
    }, [barang]); 
    // ---------------------------------------------

    const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'nilai_baru' || name === 'sisa_umur_tahun') {
            const cleanVal = value.replace(/\./g, "").replace(/\D/g, "");
            setFormData({ ...formData, [name]: cleanVal });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.nilai_baru || !formData.sisa_umur_tahun) {
            toast.error("Nilai Baru dan Sisa Umur wajib diisi!");
            return;
        }

        setIsLoading(true);
        const loadingToast = toast.loading("Menghitung surplus & menyimpan...");

        try {
            await api.post(`/barang/${barang.id_barang}/revaluasi`, formData);
            toast.success("Berhasil! Aset telah direvaluasi.", { id: loadingToast });
            onSuccess(); 
            onClose();   
        } catch (error) {
            console.error(error);
            const errMsg = error.response?.data?.message || "Gagal menyimpan data revaluasi.";
            toast.error(errMsg, { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 font-sans">
            <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50 rounded-t-[2rem]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-800 tracking-tight">Revaluasi Aset</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                {barang.kode_barang}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-rose-500 transition bg-white p-1 rounded-full shadow-sm hover:shadow-md"><X size={20}/></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                    
                    <div>
                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                            <Calendar size={12}/> Tanggal Penilaian
                        </label>
                        <input 
                            type="date" 
                            name="tanggal_revaluasi"
                            required
                            value={formData.tanggal_revaluasi}
                            onChange={handleChange}
                            className="w-full border border-gray-200 p-2.5 text-sm rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700" 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                <DollarSign size={12}/> Nilai Wajar Baru
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Rp</span>
                                <input 
                                    type="text" 
                                    name="nilai_baru"
                                    required
                                    placeholder="0"
                                    value={formatNumber(formData.nilai_baru)}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 p-2.5 pl-9 text-sm rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700" 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                <Clock size={12}/> Sisa Umur Baru (Tahun)
                            </label>
                            <div className="relative">
                                <input 
                                    type="number" // Mengganti text ke number agar lebih aman
                                    name="sisa_umur_tahun"
                                    required
                                    placeholder="Masukkan masa manfaat baru..." 
                                    value={formData.sisa_umur_tahun}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 p-2.5 text-sm rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700" 
                                />
                            </div>
                            <p className="text-[9px] text-gray-400 mt-1 italic">
                                *Tentukan sisa masa manfaat terbaru.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                            Dasar Penilaian / Keterangan
                        </label>
                        <textarea 
                            name="keterangan"
                            rows="3"
                            required
                            placeholder="Contoh: Penilaian harga pasar, Cek fisik mekanik..."
                            value={formData.keterangan}
                            onChange={handleChange}
                            className="w-full border border-gray-200 p-3 text-sm rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" 
                        ></textarea>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition">Batal</button>
                        <button type="submit" disabled={isLoading} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-70">
                            {isLoading ? "Menyimpan..." : <><Save size={16}/> Simpan Revaluasi</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}