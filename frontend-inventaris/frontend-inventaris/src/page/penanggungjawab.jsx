import React, { useState, useMemo, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast'; 
import api from '../api/axiosConfig'; 

import { 
    Search, Plus, Edit, Trash2, User, Briefcase, Users, 
    X, ChevronLeft, ChevronRight, MoreVertical, Loader2,
    AlertTriangle, Info
} from 'lucide-react';

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20];
const PJ_PATH = "/penanggungjawab"; 

export default function PenanggungJawab() {
    // --- STATE DATA UTAMA ---
    const [pjs, setPjs] = useState([]); 
    const [isLoading, setIsLoading] = useState(false); 

    // --- STATE UI & MODAL ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [currentPj, setCurrentPj] = useState(null); 
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [openPopoverId, setOpenPopoverId] = useState(null);
    
    // --- STATE DETAIL PJ ---
    const [showPjDetail, setShowPjDetail] = useState(false);
    const [detailItems, setDetailItems] = useState(null); 
    const [detailPj, setDetailPj] = useState(null); 
    const [detailCurrentPage, setDetailCurrentPage] = useState(1);
    const [detailIsLoading, setDetailIsLoading] = useState(false);
    
    // --- STATE FORM ---
    const [form, setForm] = useState({
        nama_pegawai: '',
        jabatan: '',
        divisi: '',
    });

    // -------------------- FETCH DATA --------------------
    const fetchPjs = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(PJ_PATH);
            setPjs(response.data.data); 
        } catch (error) {
            toast.error("Gagal memuat data penanggung jawab");
        } finally {
            setTimeout(() => setIsLoading(false), 500);
        }
    };

    useEffect(() => { fetchPjs(); }, []); 

    // -------------------- HANDLERS --------------------
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const openModal = (pj = null) => { 
        if (pj) {
            setCurrentPj(pj);
            setForm({ 
                nama_pegawai: pj.nama_pegawai || '', 
                jabatan: pj.jabatan || '', 
                divisi: pj.divisi || '' 
            }); 
        } else {
            setCurrentPj(null);
            setForm({ nama_pegawai: '', jabatan: '', divisi: '' });
        }
        setIsModalOpen(true); 
        setOpenPopoverId(null);
    };
    
    const closeModal = () => { 
        setIsModalOpen(false); 
        setCurrentPj(null); 
    };

    const handleDeleteClick = (pj) => {
        if (pj.barang_count > 0) {
            toast.error(`Pegawai ini masih memegang ${pj.barang_count} aset!`);
            setOpenPopoverId(null);
            return;
        }
        setItemToDelete(pj);
        setIsDeleteModalOpen(true);
        setOpenPopoverId(null);
    };

    const executeDelete = async () => {
        const loadToast = toast.loading("Menghapus data...");
        try {
            await api.delete(`${PJ_PATH}/${itemToDelete.id_penanggungjawab}`);
            toast.success("Penanggung jawab berhasil dihapus", { id: loadToast });
            setIsDeleteModalOpen(false);
            fetchPjs(); 
        } catch (error) {
            toast.error("Gagal menghapus data penanggung jawab", { id: loadToast });
        }
    };
    
    const handleSubmit = async (e) => { 
        e.preventDefault(); 
        const loadToast = toast.loading("Menyimpan data...");
        try {
            const dataToSubmit = { ...form }; 
            if (currentPj) {
                await api.put(`${PJ_PATH}/${currentPj.id_penanggungjawab}`, dataToSubmit);
                toast.success("Data berhasil diperbarui!", { id: loadToast });
            } else {
                await api.post(PJ_PATH, dataToSubmit);
                toast.success("Penanggung jawab ditambahkan!", { id: loadToast });
            }
            closeModal(); 
            fetchPjs(); 
        } catch (error) {
            toast.error("Gagal menyimpan data PJ", { id: loadToast });
        }
    };
    
    const fetchPjDetail = async (pj, page = 1) => {
        if (page === 1 && !showPjDetail) {
            setDetailPj(pj);
            setShowPjDetail(true);
        }
        setDetailIsLoading(true);
        try {
            const response = await api.get(`${PJ_PATH}/${pj.id_penanggungjawab}/barang`, {
                params: { page: page }
            });
            setDetailItems(response.data.data); 
            setDetailCurrentPage(page);
        } catch (error) {
            toast.error("Gagal memuat detail aset");
        } finally {
            setDetailIsLoading(false);
        }
    };

    const handleRowClick = (pj) => {
        fetchPjDetail(pj, 1);
        setOpenPopoverId(null);
    };

    // -------------------- SEARCH & PAGINATION UTAMA --------------------
    const filteredPjs = useMemo(() => {
        return pjs.filter(pj =>
            pj.nama_pegawai?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pj.jabatan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pj.divisi?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [pjs, searchTerm]);

    const totalItems = filteredPjs.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredPjs.slice(startIndex, startIndex + itemsPerPage);
    
    const paginate = (pageNumber) => {
        if (pageNumber > 0 && pageNumber <= totalPages) setCurrentPage(pageNumber);
    };

    const detailTotalPages = detailItems?.last_page || 1;
    const detailTotalItems = detailItems?.total || 0;

    return (
        <div className="p-4 lg:p-5 min-h-screen text-left"> 
            <Toaster position="top-right" />
            
            {/* HEADER */}
            <div className="mb-6">
                <h2 className="text-xl lg:text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 leading-none">
                    Penanggung Jawab Aset
                </h2>
                <p className="text-[12px] text-gray-400 font-medium mt-1">Daftar pegawai yang bertanggung jawab atas penggunaan dan pemeliharaan aset.</p>
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"> 
                <div className="relative w-full md:w-80"> 
                    <input
                        type="text"
                        placeholder="Cari nama, jabatan, atau divisi..."
                        className="pl-9 pr-4 py-1.5 w-full rounded-lg bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <button onClick={() => openModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-100 hover:bg-blue-700 transition flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest leading-none">
                    <Plus size={16} /> Tambah Penanggung Jawab
                </button>
            </div>

            {/* TABLE AREA */}
            <div className="overflow-x-auto mb-4 -mx-4 sm:mx-0"> 
                <table className="w-full text-left border-separate border-spacing-y-2 min-w-[750px] px-4 sm:px-0">
                    <thead>
                        <tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em]">
                            <th className="px-4 py-2">Nama Pegawai</th>
                            <th className="px-4 py-2">Jabatan / Divisi</th>
                            <th className="px-4 py-2">Aset Dipegang</th>
                            <th className="px-4 py-2 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {isLoading ? (
                            <tr>
                                <td colSpan="4" className="py-20 text-center bg-white rounded-2xl border shadow-sm">
                                    <Loader2 className="animate-spin h-6 w-6 text-blue-600 mx-auto mb-2" />
                                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Sinkronisasi Data Pegawai...</span>
                                </td>
                            </tr>
                        ) : currentData.length > 0 ? (
                            currentData.map((pj) => (
                                <tr key={pj.id_penanggungjawab} className="bg-white shadow-sm hover:shadow-md hover:ring-1 hover:ring-blue-100 transition-all cursor-pointer group" onClick={() => handleRowClick(pj)}>
                                    <td className="px-4 py-3 rounded-l-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                <User size={16} />
                                            </div>
                                            <span className="font-bold text-gray-800">{pj.nama_pegawai}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-gray-700 font-semibold leading-tight">{pj.jabatan}</span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{pj.divisi}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                                            {pj.barang_count || 0} Unit Aset
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 rounded-r-xl text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative inline-block">
                                            <button onClick={() => setOpenPopoverId(openPopoverId === pj.id_penanggungjawab ? null : pj.id_penanggungjawab)} className="text-gray-400 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100 transition">
                                                <MoreVertical size={18} />
                                            </button>
                                            {openPopoverId === pj.id_penanggungjawab && (
                                                <div className="absolute right-0 top-full mt-1 w-32 rounded-xl shadow-xl bg-white ring-1 ring-black/5 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                    <button onClick={() => openModal(pj)} className="flex items-center gap-2 w-full px-4 py-2.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-50">
                                                        <Edit size={14} className="text-blue-500" /> Edit
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(pj)} className={`flex items-center gap-2 w-full px-4 py-2.5 text-[11px] font-bold ${pj.barang_count > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`} disabled={pj.barang_count > 0}>
                                                        <Trash2 size={14} /> Hapus
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="px-4 py-16 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest bg-white rounded-2xl border">Data tidak ditemukan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4"> 
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {totalItems === 0 ? 'Tidak ada data' : `Menampilkan ${startIndex + 1}-${Math.min(totalItems, startIndex + itemsPerPage)} dari ${totalItems} Pegawai`}
                </div>
                <div className="flex items-center gap-3">
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-2 py-1 border border-gray-200 rounded text-[10px] font-black bg-white text-gray-600 outline-none">
                        {ITEMS_PER_PAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} / page</option>)}
                    </select>
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white">
                        <button onClick={() => paginate(currentPage-1)} disabled={currentPage === 1} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-r transition-colors"><ChevronLeft size={14}/></button>
                        <span className="px-3 py-1.5 text-[11px] font-black text-blue-600 bg-blue-50/50">{currentPage}</span>
                        <button onClick={() => paginate(currentPage+1)} disabled={currentPage === totalPages} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-l transition-colors"><ChevronRight size={14}/></button>
                    </div>
                </div>
            </div>

            {/* MODAL FORM */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
                            <h3 className="text-lg font-black text-gray-800 tracking-tight">{currentPj ? 'Edit Pegawai' : 'Tambah Pegawai'}</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4 text-left">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Lengkap Pegawai</label>
                                <input type="text" name="nama_pegawai" value={form.nama_pegawai} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Nama Lengkap" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jabatan Struktur</label>
                                <input type="text" name="jabatan" value={form.jabatan} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Cth: Staff Administrasi" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Divisi / Departemen</label>
                                <input type="text" name="divisi" value={form.divisi} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Cth: SDM / IT" />
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-6">
                                <button type="button" onClick={closeModal} className="px-5 py-2 text-[10px] font-black uppercase text-gray-500 hover:text-gray-700 transition">Batal</button>
                                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI HAPUS */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 tracking-tight mb-2">Hapus Pegawai?</h3>
                        <p className="text-[12px] text-gray-400 font-medium mb-8 leading-relaxed">Apakah Anda yakin menghapus <span className="font-bold text-gray-800">"{itemToDelete?.nama_pegawai}"</span>? Semua data tanggung jawab akan terputus.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2.5 text-[10px] font-black uppercase text-gray-500 hover:text-gray-700 transition">Batal</button>
                            <button onClick={executeDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-700 transition">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL PJ */}
            {showPjDetail && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl p-6 md:p-8 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
                            <div className="text-left text-black">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 block">Profil Penganggung Jawab</span>
                                <h3 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                                    <User size={24} className="text-blue-600" /> {detailPj?.nama_pegawai}
                                </h3>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{detailPj?.jabatan} — {detailPj?.divisi}</p>
                            </div>
                            <button onClick={() => setShowPjDetail(false)} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:text-red-500 transition"><X size={20} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto no-scrollbar text-left text-black">
                            {detailIsLoading ? (
                                <div className="py-20 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-600" /></div>
                            ) : (
                                <table className="w-full text-sm border-separate border-spacing-y-1.5">
                                    <thead>
                                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <th className="px-4 py-2">Kode Aset</th>
                                            <th className="px-4 py-2">Nama Barang</th>
                                            <th className="px-4 py-2 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailItems?.data?.map(item => (
                                            <tr key={item.id_barang} className="bg-gray-50 group hover:bg-blue-50 transition-colors">
                                                <td className="px-4 py-3 rounded-l-xl font-bold text-blue-600">{item.kode_barang}</td>
                                                <td className="px-4 py-3 font-semibold text-gray-700">{item.nama_barang}</td>
                                                <td className="px-4 py-3 rounded-r-xl text-right uppercase font-black text-[9px] tracking-widest">
                                                    <span className={`px-2 py-0.5 rounded-full ${
                                                            item.status === "tersedia" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                                                            item.status === "dihapus" ? "bg-rose-50 text-rose-600 border-rose-100" : 
                                                            "bg-amber-50 text-amber-600 border-amber-100"
                                                        }`}>
                                                            {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {detailTotalItems === 0 && (
                                            <tr><td colSpan="3" className="py-10 text-center text-gray-400 italic">Pegawai belum memegang aset apapun.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination Detail */}
                        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {detailTotalItems} Aset sedang dikelola
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                                    <button 
                                        onClick={() => fetchPjDetail(detailPj, detailCurrentPage - 1)} 
                                        disabled={detailCurrentPage === 1 || detailIsLoading}
                                        className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-r transition-colors"
                                    >
                                        <ChevronLeft size={14}/>
                                    </button>
                                    <span className="px-3 py-1.5 text-[11px] font-black text-blue-600 bg-blue-50/50">
                                        {detailCurrentPage} / {detailTotalPages}
                                    </span>
                                    <button 
                                        onClick={() => fetchPjDetail(detailPj, detailCurrentPage + 1)} 
                                        disabled={detailCurrentPage === detailTotalPages || detailIsLoading}
                                        className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-l transition-colors"
                                    >
                                        <ChevronRight size={14}/>
                                    </button>
                                </div>
                                <button onClick={() => setShowPjDetail(false)} className="px-6 py-2 bg-gray-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition shadow-lg shadow-gray-200">Tutup</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}