import React, { useState, useEffect, useCallback, useMemo } from 'react'; 
import api from '../api/axiosConfig'; 
import toast, { Toaster } from 'react-hot-toast';
import { 
    X, ChevronLeft, ChevronRight, UserPlus, Loader2, 
    Calendar, Info, Search, AlertTriangle, Clock, Mail, Shield 
} from "lucide-react"; 

const availableRoles = ['user', 'admin', 'supervisor', 'staf']; 

// =========================================================
// 1. KOMPONEN PEMBANTU (Detail Item) - RE-SCALED
// =========================================================
const DetailItem = ({ label, value }) => (
    <div className="flex justify-between border-b border-gray-100 py-1.5 gap-4">
        <span className="text-gray-500 font-medium text-[10px] uppercase tracking-widest">{label}:</span>
        <span className="font-bold text-xs text-gray-800 text-right">{value || '-'}</span>
    </div>
);

// =========================================================
// 2. MODAL KONFIRMASI CUSTOM
// =========================================================
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, type = 'danger' }) {
    if (!isOpen) return null;
    const themes = {
        danger: { bg: 'bg-rose-100', icon: 'text-rose-600', button: 'bg-rose-600 hover:bg-rose-700' },
        warning: { bg: 'bg-amber-100', icon: 'text-amber-600', button: 'bg-amber-600 hover:bg-amber-700' }
    };
    const theme = themes[type];
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                <div className={`w-16 h-16 ${theme.bg} ${theme.icon} rounded-full flex items-center justify-center mx-auto mb-6`}><AlertTriangle size={32} /></div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight mb-2">{title}</h3>
                <p className="text-[12px] text-gray-400 font-medium mb-8 leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition">Batal</button>
                    <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 py-2.5 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition ${theme.button}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}

// =========================================================
// 3. MODAL DETAIL USER (Lengkap dengan Logika Asli)
// =========================================================
function DetailUserModal({ isOpen, onClose, user }) {
    if (!isOpen || !user) return null;
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-left">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="text-left">
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mb-1 inline-block">ID Akun: {user.id}</span>
                        <h2 className="text-lg font-black text-gray-800 truncate leading-none">{user.email}</h2>
                    </div>
                    <button onClick={onClose} className="bg-white p-2 rounded-full shadow-sm border border-gray-100 hover:text-red-500 transition"><X size={18}/></button>
                </div>
                <div className="p-8 space-y-3">
                    <h3 className="text-[11px] font-black text-indigo-500 uppercase tracking-widest border-b pb-1">Informasi Dasar</h3>
                    <DetailItem label="Nama Lengkap" value={user.name || 'BELUM DIATUR'} />
                    <DetailItem label="Email" value={user.email} />
                    <DetailItem label="Role Sistem" value={user.role?.toUpperCase()} />
                    <DetailItem label="Status Saat Ini" value={user.status_text} />
                    
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b pb-1 mt-6">Waktu Aktivasi</h3>
                    <DetailItem label="Akun Dibuat" value={formatDate(user.created_at)} />
                    {user.is_active ? (
                        <DetailItem label="Status Aktivasi" value="Aktif Penuh" />
                    ) : (
                        user.is_expired ? (
                            <DetailItem label="Token Kadaluarsa" value={`Kadaluarsa (${formatDate(user.token_expires_at)})`} />
                        ) : (
                            user.token_expires_at && <DetailItem label="Token Berlaku Hingga" value={formatDate(user.token_expires_at)} />
                        )
                    )}
                </div>
                <div className="p-6 bg-gray-50 border-t flex justify-end">
                    <button onClick={onClose} className="px-10 py-2.5 bg-gray-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition">Tutup</button>
                </div>
            </div>
        </div>
    );
}

// =========================================================
// 4. MODAL UNDANGAN (Lengkap dengan Logika Asli)
// =========================================================
function InviteUserModal({ isOpen, onClose, onInviteSuccess }) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('user'); 
    const [loading, setLoading] = useState(false);
    
    useEffect(() => { if (isOpen) { setEmail(''); setRole('user'); } }, [isOpen]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const loadToast = toast.loading("Mengirim undangan...");
        try {
            const response = await api.post('/admin/invite-user', { email, role });
            toast.success(response.data.message, { id: loadToast });
            onInviteSuccess();
            onClose();
        } catch (err) {
            let errorMsg = 'Gagal mengirim undangan.';
            if (err.response?.data?.errors?.email) errorMsg = err.response.data.errors.email[0];
            else if (err.response?.data?.message) errorMsg = err.response.data.message;
            toast.error(errorMsg, { id: loadToast });
        } finally { setLoading(false); }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-left">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h3 className="text-xl font-black text-gray-800 tracking-tight">Kirim Undangan</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Email Karyawan</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@perusahaan.com" required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Pilih Role</label>
                        <select value={role} onChange={(e) => setRole(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none">
                            {availableRoles.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3 pt-6">
                        <button onClick={onClose} type="button" className="flex-1 py-2.5 text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition">Batal</button>
                        <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition disabled:bg-gray-400">{loading ? 'Mengirim...' : 'Kirim Undangan'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =========================================================
// 5. KOMPONEN UTAMA (Lengkap dengan Fitur & Logika Asli)
// =========================================================
export default function AdminInviteUser() {
    const [users, setUsers] = useState([]);
    const [tableLoading, setTableLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false); 
    const [selectedUser, setSelectedUser] = useState(null); 
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); 
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, onConfirm: () => {}, title: '', message: '', confirmText: '', type: 'danger' });

    const fetchUsers = useCallback(async () => {
        setTableLoading(true);
        try {
            const response = await api.get('/admin/user'); 
            setUsers(response.data);
        } catch (err) { toast.error('Gagal memuat data pengguna.'); }
        finally { setTimeout(() => setTableLoading(false), 500); }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleToggleStatus = (user) => {
        const action = user.is_active ? 'Menonaktifkan' : 'Mengaktifkan kembali';
        setConfirmConfig({
            isOpen: true,
            title: 'Ubah Status Akun?',
            message: `Apakah Anda yakin ingin ${action.toLowerCase()} akun ${user.email}?`,
            confirmText: `Ya, ${user.is_active ? 'Nonaktifkan' : 'Aktifkan'}`,
            type: 'warning',
            onConfirm: async () => {
                const loadToast = toast.loading("Memperbarui status...");
                try {
                    const response = await api.patch(`/admin/user/${user.id}/status`);
                    setUsers(users.map(u => u.id === user.id ? { ...u, is_active: response.data.is_active, status_text: response.data.is_active ? 'Aktif' : 'Dinonaktifkan' } : u));
                    toast.success(response.data.message, { id: loadToast });
                } catch (err) { toast.error("Gagal mengubah status.", { id: loadToast }); }
            }
        });
    };

    const handleDelete = (userId, userEmail) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Hapus Permanen?',
            message: `Yakin ingin menghapus akun ${userEmail} permanen? Akun ini belum aktif/kadaluarsa.`,
            confirmText: 'Ya, Hapus Akun',
            type: 'danger',
            onConfirm: async () => {
                const loadToast = toast.loading("Menghapus akun...");
                try {
                    await api.delete(`/admin/user/${userId}`); 
                    setUsers(users.filter(user => user.id !== userId)); 
                    toast.success(`Akun ${userEmail} dihapus.`, { id: loadToast });
                } catch (err) { toast.error(err.response?.data?.message || 'Gagal menghapus.', { id: loadToast }); }
            }
        });
    };

    // --- LOGIKA FILTERING & PAGINATION (PASTIKAN SEPERTI INI) ---
    const filteredUsers = useMemo(() => {
        const lowSearch = searchTerm.toLowerCase();
        return users.filter(user =>
            (user.name?.toLowerCase() || '').includes(lowSearch) || 
            user.email.toLowerCase().includes(lowSearch) ||
            user.role.toLowerCase().includes(lowSearch) ||
            user.status_text.toLowerCase().includes(lowSearch)
        );
    }, [users, searchTerm]);

    // Hitung Index
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    const currentItems = useMemo(() => {
        return filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredUsers, indexOfFirstItem, indexOfLastItem]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    const paginate = (pageNumber) => {
        if (pageNumber > 0 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    // --- LOGIKA RENDER NOMOR HALAMAN ASLI ---
    const renderPageNumbers = () => {
        const pageNumbers = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
        } else {
            let start = Math.max(1, currentPage - 2);
            let end = Math.min(totalPages, currentPage + 2);
            if (currentPage <= 3) end = Math.min(totalPages, maxVisible);
            else if (currentPage >= totalPages - 2) start = totalPages - 4;
            for (let i = start; i <= end; i++) pageNumbers.push(i);
            if (start > 1) { if (start > 2) pageNumbers.unshift('...'); pageNumbers.unshift(1); }
            if (end < totalPages) { if (end < totalPages - 1) pageNumbers.push('...'); pageNumbers.push(totalPages); }
        }
        return pageNumbers.filter((v, i, a) => a.indexOf(v) === i);
    };

    return (
        <div className="p-4 lg:p-5 min-h-screen text-left"> 
            <Toaster position="top-right" />
            
            <div className="mb-6">
                <h2 className="text-xl lg:text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 leading-none ">Pengelolaan Pengguna</h2>
                <p className="text-[12px] text-gray-400 font-medium mt-1">Atur hak akses staf dan kelola undangan aktivasi akun secara terpusat.</p>
            </div>
            
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-80"> 
                    <input type="text" placeholder="Cari pengguna..." className="pl-9 pr-4 py-1.5 w-full rounded-lg border border-gray-200 bg-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <button onClick={() => setIsInviteModalOpen(true)} className="flex items-center justify-center bg-indigo-600 text-white px-5 py-2 rounded-lg shadow-lg hover:bg-indigo-700 transition text-[10px] font-black uppercase tracking-widest"><UserPlus size={16} className="mr-2" /> Undang Karyawan</button>
            </div>
            
            <div className="overflow-x-auto mb-4 -mx-4 sm:mx-0"> 
                <table className="w-full text-left border-separate border-spacing-y-2 min-w-[800px] px-4 sm:px-0">
                    <thead>
                        <tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em]">
                            <th className="px-4 py-2">No.</th>
                            <th className="px-4 py-2">Nama Lengkap</th> 
                            <th className="px-4 py-2">Email</th>
                            <th className="px-4 py-2">Role</th>
                            <th className="px-4 py-2 text-center">Status</th>
                            <th className="px-4 py-2 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {tableLoading ? (
                            <tr><td colSpan="6" className="py-20 text-center bg-white rounded-2xl border shadow-sm"><Loader2 className="animate-spin h-6 w-6 text-indigo-600 mx-auto mb-2" /><span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Memuat Pengguna...</span></td></tr>
                        ) : currentItems.map((user, index) => ( 
                            <tr key={user.id} className={`bg-white shadow-sm transition cursor-pointer group ${user.is_active ? 'hover:shadow-md hover:ring-1 hover:ring-indigo-100' : 'bg-amber-50/50 hover:bg-amber-50'}`} onClick={() => { setSelectedUser(user); setShowDetailModal(true); }}>
                                <td className="px-4 py-3 rounded-l-xl font-bold text-gray-400">{indexOfFirstItem + index + 1}</td>
                                <td className="px-4 py-3 font-bold text-gray-800">{user.name || '-'}</td>
                                <td className="px-4 py-3 text-gray-500 font-medium">{user.email}</td>
                                <td className="px-4 py-3 font-bold text-gray-600 uppercase text-[10px] tracking-wider">{user.role}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border ${
                                        user.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                        (user.is_expired ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100')
                                    }`}>{user.status_text}</span>
                                </td>
                                <td className="px-4 py-3 rounded-r-xl text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-end gap-2">
                                        {user.is_active || user.status_text === 'Dinonaktifkan' ? (
                                            <button onClick={() => handleToggleStatus(user)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${user.is_active ? 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white'}`}>{user.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                                        ) : null}
                                        {user.can_delete && !user.is_active && (
                                            <button onClick={() => handleDelete(user.id, user.email)} className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all">Hapus</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* UI PAGINATION ASLI (RE-SCALED) */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4"> 
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Menampilkan {filteredUsers.length === 0 ? 0 : indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredUsers.length)} dari {filteredUsers.length} Pengguna
                </div>
                <div className="flex items-center gap-3">
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-2 py-1 border border-gray-200 rounded text-[10px] font-black bg-white outline-none">
                        {[5, 10, 20].map(opt => <option key={opt} value={opt}>{opt} / page</option>)}
                    </select>
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white">
                        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-r transition"><ChevronLeft size={14}/></button>
                        <div className="flex">
                            {renderPageNumbers().map((number, idx) => (
                                <button key={idx} onClick={() => typeof number === 'number' && paginate(number)} disabled={typeof number !== 'number'} className={`px-3 py-1 text-[11px] font-black border-r last:border-r-0 transition ${number === currentPage ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50 text-gray-400'}`}>{number}</button>
                            ))}
                        </div>
                        <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-l transition"><ChevronRight size={14}/></button>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <InviteUserModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onInviteSuccess={() => { fetchUsers(); setCurrentPage(1); }} />
            <DetailUserModal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} user={selectedUser} />
            <ConfirmModal isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} message={confirmConfig.message} confirmText={confirmConfig.confirmText} type={confirmConfig.type} />
        </div>
    );
}