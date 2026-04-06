import React, { useState, useMemo, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast'; 
import api from '../api/axiosConfig'; 
import { 
    Search, Plus, Edit, Trash2, Map, X, 
    ChevronLeft, ChevronRight, MoreVertical, Loader2, AlertTriangle, Box
} from 'lucide-react';

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20];
const LOCATION_PATH = "/lokasi"; 

export default function Lokasi() {
    // --- STATE DATA UTAMA ---
    const [locations, setLocations] = useState([]); 
    const [isLoading, setIsLoading] = useState(false); 

    // --- STATE UI & MODAL ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null); 
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // --- STATE KONFIRMASI HAPUS ---
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // --- STATE UNTUK POPOVER ---
    const [openPopoverId, setOpenPopoverId] = useState(null);
    
    // --- STATE DETAIL LOKASI (DENGAN PAGINATION) ---
    const [showLocationDetail, setShowLocationDetail] = useState(false);
    const [detailItems, setDetailItems] = useState(null); 
    const [detailLocation, setDetailLocation] = useState(null); 
    const [detailCurrentPage, setDetailCurrentPage] = useState(1);
    const [detailIsLoading, setDetailIsLoading] = useState(false);
    
    // --- STATE FORM ---
    const [form, setForm] = useState({ nama: '' });

    // -------------------- FETCH DATA --------------------
    const fetchLocations = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(LOCATION_PATH);
            setLocations(response.data.data); 
        } catch (error) {
            toast.error("Gagal memuat data lokasi.");
        } finally {
            setTimeout(() => setIsLoading(false), 500);
        }
    };

    useEffect(() => { fetchLocations(); }, []); 

    // -------------------- HANDLERS --------------------
    const openModal = (location = null) => { 
        if (location) {
            setCurrentLocation(location);
            setForm({ nama: location.nama_lokasi || '' }); 
        } else {
            setCurrentLocation(null);
            setForm({ nama: '' });
        }
        setIsModalOpen(true); 
        setOpenPopoverId(null);
    };
    
    const closeModal = () => { 
        setIsModalOpen(false); 
        setCurrentLocation(null); 
        setForm({ nama: '' });
    };

    const handleDeleteClick = (location) => {
        if (location.barang_count > 0) {
            toast.error(`Gagal! Masih ada ${location.barang_count} aset di lokasi ini.`);
            setOpenPopoverId(null);
            return;
        }
        setItemToDelete(location);
        setIsDeleteModalOpen(true);
        setOpenPopoverId(null);
    };

    const executeDelete = async () => {
        const loadToast = toast.loading("Menghapus lokasi...");
        try {
            await api.delete(`${LOCATION_PATH}/${itemToDelete.id_lokasi}`);
            toast.success("Lokasi berhasil dihapus!", { id: loadToast });
            setIsDeleteModalOpen(false);
            fetchLocations(); 
        } catch (error) {
            toast.error("Gagal menghapus data.", { id: loadToast });
        }
    };
    
    const handleSubmit = async (e) => { 
        e.preventDefault(); 
        const loadToast = toast.loading("Menyimpan data...");
        try {
            const dataToSubmit = { nama_lokasi: form.nama }; 
            if (currentLocation) {
                await api.put(`${LOCATION_PATH}/${currentLocation.id_lokasi}`, dataToSubmit);
                toast.success("Lokasi diperbarui!", { id: loadToast });
            } else {
                await api.post(LOCATION_PATH, dataToSubmit);
                toast.success("Lokasi ditambahkan!", { id: loadToast });
            }
            closeModal(); 
            fetchLocations(); 
        } catch (error) {
            toast.error("Gagal menyimpan data.", { id: loadToast });
        }
    };
    
    const fetchLocationDetail = async (location, page = 1) => {
        if (page === 1 && !showLocationDetail) {
            setDetailLocation(location);
            setShowLocationDetail(true);
        }
        setDetailIsLoading(true);
        try {
            const response = await api.get(`${LOCATION_PATH}/${location.id_lokasi}/barang`, {
                params: { page: page }
            });
            setDetailItems(response.data.data); 
            setDetailCurrentPage(page);
        } catch (error) {
            toast.error("Gagal memuat detail barang.");
        } finally {
            setDetailIsLoading(false);
        }
    };

    const handleRowClick = (location) => {
        fetchLocationDetail(location, 1);
        setOpenPopoverId(null);
    };

    // -------------------- LOGIKA PAGINATION & SEARCH --------------------
    const filteredLocations = useMemo(() => {
        return locations.filter(l => l.nama_lokasi?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [locations, searchTerm]);

    const totalItems = filteredLocations.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredLocations.slice(startIndex, startIndex + itemsPerPage);
    
    const paginate = (n) => { if (n > 0 && n <= totalPages) setCurrentPage(n); };

    const detailTotalPages = detailItems?.last_page || 1;
    const detailTotalItems = detailItems?.total || 0;

    return (
        <div className="p-4 lg:p-5 min-h-screen text-left"> 
            <Toaster position="top-right" />
            
            {/* HEADER */}
            <div className="mb-6">
                <h2 className="text-xl lg:text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 leading-none">
                    Lokasi Penempatan
                </h2>
                <p className="text-[12px] text-gray-400 font-medium mt-1">Daftar ruangan atau area fisik tempat aset Anda dialokasikan.</p>
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"> 
                <div className="relative w-full md:w-80"> 
                    <input
                        type="text"
                        placeholder="Cari lokasi..."
                        className="pl-9 pr-4 py-1.5 w-full rounded-lg bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <button onClick={() => openModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-100 hover:bg-blue-700 transition flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <Plus size={16} /> Tambah Lokasi
                </button>
            </div>

            {/* TABLE AREA */}
            <div className="overflow-x-auto mb-4 -mx-4 sm:mx-0"> 
                <table className="w-full text-left border-separate border-spacing-y-2 min-w-[600px] px-4 sm:px-0">
                    <thead>
                        <tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em]">
                            <th className="px-4 py-2">Nama Lokasi</th>
                            <th className="px-4 py-2">Distribusi Aset</th>
                            <th className="px-4 py-2 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {isLoading ? (
                            <tr>
                                <td colSpan="3" className="py-20 text-center bg-white rounded-2xl border shadow-sm">
                                    <Loader2 className="animate-spin h-6 w-6 text-blue-600 mx-auto mb-2" />
                                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Sinkronisasi Lokasi...</span>
                                </td>
                            </tr>
                        ) : currentData.length > 0 ? (
                            currentData.map((location) => (
                                <tr key={location.id_lokasi} className="bg-white shadow-sm hover:shadow-md hover:ring-1 hover:ring-blue-100 transition-all cursor-pointer group" onClick={() => handleRowClick(location)}>
                                    <td className="px-4 py-3 rounded-l-xl font-bold text-gray-800">{location.nama_lokasi}</td>
                                    <td className="px-4 py-3 text-gray-700">
                                        <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                                            {location.barang_count || 0} Unit Aset
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 rounded-r-xl text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative inline-block">
                                            <button onClick={() => setOpenPopoverId(openPopoverId === location.id_lokasi ? null : location.id_lokasi)} className="text-gray-400 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100 transition">
                                                <MoreVertical size={18} />
                                            </button>
                                            {openPopoverId === location.id_lokasi && (
                                                <div className="absolute right-0 top-full mt-1 w-32 rounded-xl shadow-xl bg-white ring-1 ring-black/5 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                    <button onClick={() => openModal(location)} className="flex items-center gap-2 w-full px-4 py-2.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-50">
                                                        <Edit size={14} className="text-blue-500" /> Edit
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(location)} className={`flex items-center gap-2 w-full px-4 py-2.5 text-[11px] font-bold ${location.barang_count > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`} disabled={location.barang_count > 0}>
                                                        <Trash2 size={14} /> Hapus
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="3" className="px-4 py-16 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest bg-white rounded-2xl border">Data lokasi tidak ditemukan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4"> 
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {totalItems === 0 ? 'Tidak ada data' : `Menampilkan ${startIndex + 1}-${Math.min(totalItems, startIndex + itemsPerPage)} dari ${totalItems} Lokasi`}
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
                            <h3 className="text-lg font-black text-gray-800 tracking-tight">{currentLocation ? 'Edit Lokasi' : 'Tambah Lokasi'}</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="text-left">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Lokasi / Ruangan</label>
                                <input type="text" value={form.nama} onChange={(e) => setForm({ nama: e.target.value })} placeholder="Cth: Ruang Server Utama" required className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
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
                        <h3 className="text-xl font-black text-gray-800 tracking-tight mb-2">Hapus Lokasi?</h3>
                        <p className="text-[12px] text-gray-400 font-medium mb-8 leading-relaxed">Apakah Anda yakin menghapus lokasi <span className="font-bold text-gray-800">"{itemToDelete?.nama_lokasi}"</span>? Aksi ini tidak dapat dibatalkan.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2.5 text-[10px] font-black uppercase text-gray-500 hover:text-gray-700 transition">Batal</button>
                            <button onClick={executeDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-700 transition">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL LOKASI */}
            {showLocationDetail && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl p-6 md:p-8 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
                            <div className="text-left">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 block">Detail Inventaris</span>
                                <h3 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                                    <Map size={24} className="text-blue-600" /> {detailLocation?.nama_lokasi}
                                </h3>
                            </div>
                            <button onClick={() => setShowLocationDetail(false)} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:text-red-500 transition"><X size={20} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto no-scrollbar text-left">
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
                                            <tr><td colSpan="3" className="py-10 text-center text-gray-400 italic">Belum ada aset terdaftar di lokasi ini.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination dalam Detail */}
                        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Total {detailTotalItems} Aset ditemukan
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                                    <button 
                                        onClick={() => fetchLocationDetail(detailLocation, detailCurrentPage - 1)} 
                                        disabled={detailCurrentPage === 1 || detailIsLoading}
                                        className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-r transition-colors"
                                    >
                                        <ChevronLeft size={14}/>
                                    </button>
                                    <span className="px-3 py-1.5 text-[11px] font-black text-blue-600 bg-blue-50/50">
                                        {detailCurrentPage} / {detailTotalPages}
                                    </span>
                                    <button 
                                        onClick={() => fetchLocationDetail(detailLocation, detailCurrentPage + 1)} 
                                        disabled={detailCurrentPage === detailTotalPages || detailIsLoading}
                                        className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-l transition-colors"
                                    >
                                        <ChevronRight size={14}/>
                                    </button>
                                </div>
                                <button onClick={() => setShowLocationDetail(false)} className="px-6 py-2 bg-gray-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition shadow-lg shadow-gray-200">Tutup</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}