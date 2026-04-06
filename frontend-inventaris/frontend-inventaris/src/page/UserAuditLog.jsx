import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axiosConfig'; 
import { 
    History, Search, ChevronLeft, ChevronRight, 
    Monitor, User as UserIcon, Loader2, Clock, Globe
} from "lucide-react";

// =========================================================
// 1. KOMPONEN PEMBANTU (Detail Item - Jika diperlukan modal)
// =========================================================
const DetailItem = ({ label, value, icon: Icon }) => (
    <div className="flex items-center justify-between border-b border-gray-100 py-2 gap-4">
        <div className="flex items-center gap-2 text-gray-500">
            {Icon && <Icon size={14} />}
            <span className="font-medium text-[10px] uppercase tracking-widest">{label}:</span>
        </div>
        <span className="font-bold text-xs text-gray-800 text-right">{value || '-'}</span>
    </div>
);

// =========================================================
// 2. KOMPONEN UTAMA: USER AUDIT LOG
// =========================================================
export default function UserAuditLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // ------------------------- FUNGSI FETCH DATA -------------------------
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/audit-logs');
            setLogs(response.data);
        } catch (error) {
            console.error("Gagal mengambil log:", error);
        } finally {
            setTimeout(() => setLoading(false), 500);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    /// --- LOGIKA FILTERING & PAGINATION ---
    const filteredLogs = useMemo(() => {
        let filtered = logs;
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(log =>
                log.email.toLowerCase().includes(lowerCaseSearch) ||
                log.activity.toLowerCase().includes(lowerCaseSearch) ||
                (log.ip_address && log.ip_address.includes(lowerCaseSearch))
            );
        }
        return filtered;
    }, [logs, searchTerm]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    // PASTIKAN BARIS INI ADA:
    const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

    const paginate = (pageNumber) => {
        if (pageNumber > 0 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    const renderPageNumbers = () => {
        const pageNumbers = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
        } else {
            let start = Math.max(1, currentPage - 1);
            let end = Math.min(totalPages, currentPage + 1);
            if (currentPage <= 2) end = Math.min(totalPages, 4);
            else if (currentPage >= totalPages - 1) start = Math.max(1, totalPages - 3);
            for (let i = start; i <= end; i++) pageNumbers.push(i);
            if (start > 1) { if (start > 2) pageNumbers.unshift('...'); pageNumbers.unshift(1); }
            if (end < totalPages) { if (end < totalPages - 1) pageNumbers.push('...'); pageNumbers.push(totalPages); }
        }
        return [...new Set(pageNumbers)];
    };

    // ------------------------- RENDERING UI -------------------------
    return (
        <div className="p-4 lg:p-5 min-h-screen text-left">
            
            {/* HEADER */}
            <div className="mb-6">
                <h2 className="text-xl lg:text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 leading-none">
                    Audit Trail Sistem
                    {loading && <Loader2 className="animate-spin text-indigo-600" size={20} />}
                </h2>
                <p className="text-[12px] text-gray-400 font-medium mt-1">Rekaman aktivitas pengguna, akses perangkat, dan perubahan data secara kronologis.</p>
            </div>

            {/* TOOLBAR */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Cari email, aktivitas, atau IP..."
                        className="pl-9 pr-4 py-1.5 w-full rounded-lg border border-gray-200 bg-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>

                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
                    <History size={14} className="text-indigo-500" />
                    Log Tercatat: <span className="text-indigo-600">{filteredLogs.length}</span>
                </div>
            </div>

            {/* TABEL AUDIT LOG (RE-SCALED) */}
            <div className="overflow-x-auto mb-4 -mx-4 sm:mx-0">
                <table className="w-full text-left border-separate border-spacing-y-2 min-w-[900px] px-4 sm:px-0">
                    <thead>
                        <tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em]">
                            <th className="px-4 py-2">Waktu & Tanggal</th>
                            <th className="px-4 py-2">Email Pengguna</th>
                            <th className="px-4 py-2">Aktivitas</th>
                            <th className="px-4 py-2">Perangkat / Browser</th>
                            <th className="px-4 py-2 text-right">IP Address</th>
                        </tr>
                    </thead>

                    <tbody className="text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="py-20 text-center bg-white rounded-2xl border shadow-sm">
                                    <Loader2 className="animate-spin h-6 w-6 text-indigo-600 mx-auto mb-2" />
                                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Sinkronisasi Log...</span>
                                </td>
                            </tr>
                        ) : currentItems.length > 0 ? (
                            currentItems.map((log) => (
                                <tr key={log.id} className="bg-white shadow-sm rounded-xl transition hover:shadow-md hover:ring-1 hover:ring-indigo-100 group">
                                    <td className="px-4 py-3 rounded-l-xl">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800 leading-tight">{new Date(log.created_at).toLocaleDateString('id-ID')}</span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter flex items-center gap-1">
                                                <Clock size={10} /> {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors border border-gray-100">
                                                <UserIcon size={12} />
                                            </div>
                                            <span className="font-bold text-gray-700 text-xs">{log.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border ${
                                            log.activity.includes('Berhasil') || log.activity.includes('Selesai')
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                            : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                        }`}>
                                            {log.activity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 max-w-[200px]">
                                            <Monitor size={12} className="text-gray-300 shrink-0" />
                                            <span className="text-[11px] text-gray-500 font-medium truncate" title={log.browser}>
                                                {log.browser || 'Unknown Device'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 rounded-r-xl text-right">
                                        <span className="px-2 py-1 bg-gray-50 text-gray-400 rounded text-[10px] font-mono border border-gray-100 font-bold">
                                            {log.ip_address || '0.0.0.0'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="px-4 py-16 text-center text-gray-400 text-[10px] font-black uppercase bg-white border rounded-2xl">
                                    {searchTerm ? "Data log tidak ditemukan." : "Belum ada riwayat aktivitas."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION (STYLE KONSISTEN) */}
            {filteredLogs.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredLogs.length)} dari {filteredLogs.length} Log
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-2 py-1 border border-gray-200 rounded text-[10px] font-black bg-white outline-none"
                        >
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
                            <option value={50}>50 / page</option>
                        </select>

                        <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-r transition"
                            >
                                <ChevronLeft size={14} />
                            </button>

                            <div className="flex">
                                {renderPageNumbers().map((number, index) => (
                                    <button
                                        key={index}
                                        onClick={() => typeof number === 'number' && paginate(number)}
                                        disabled={typeof number !== 'number'}
                                        className={`px-3 py-1.5 text-[11px] font-black border-r last:border-r-0 transition ${
                                            number === currentPage ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50 text-gray-400'
                                        }`}
                                    >
                                        {number}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-l transition"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}