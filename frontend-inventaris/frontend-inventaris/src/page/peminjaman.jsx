import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../api/axiosConfig'; 

import { Html5QrcodeScanner } from 'html5-qrcode'; 
import { 
    Search, Clock, CheckCircle, XCircle, 
    User, Box, Send, Home, Loader2, Tag, DollarSign, 
    Info, History, QrCode, X, Plus, ChevronLeft, ChevronRight,
    Calendar, ClipboardList, ShieldAlert
} from 'lucide-react';

// --- Konstanta ---
const PEMINJAMAN_PATH = '/peminjaman';
const PENGEMBALIAN_PATH = '/pengembalian';
const BARANG_PATH = '/barang';
const PJ_PATH = '/penanggungjawab';
const ITEMS_PER_PAGE_OPTIONS = [5, 10, 25, 50]; 

// --- Helper Functions ---
const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatRupiah = (amountString) => {
    if (!amountString) return 'N/A';
    const amount = parseFloat(amountString);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(amount);
};

const getLoanStatus = (statusDB, targetDate) => {
    if (statusDB === 'dikembalikan') return 'Selesai'; 
    const today = new Date(); 
    today.setHours(0, 0, 0, 0); 
    const target = new Date(targetDate); 
    target.setHours(0, 0, 0, 0);
    if (today > target) return 'Terlambat';
    return 'Dipinjam';
};

const getStatusBadge = (status) => {
    switch (status) {
        case 'Dipinjam':
            return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border bg-amber-50 text-amber-600 border-amber-100 inline-flex items-center gap-1"><Clock size={10}/> Dipinjam</span>;
        case 'Selesai':
            return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border bg-emerald-50 text-emerald-600 border-emerald-100 inline-flex items-center gap-1"><CheckCircle size={10}/> Selesai</span>;
        case 'Terlambat':
            return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border bg-rose-50 text-rose-600 border-rose-100 inline-flex items-center gap-1"><ShieldAlert size={10}/> Terlambat</span>;
        default:
            return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border bg-gray-50 text-gray-500 border-gray-100">N/A</span>;
    }
};

const calculateDuration = (startDateString, endDateString) => {
    if (!startDateString || !endDateString) return '-';
    const start = new Date(startDateString);
    const end = new Date(endDateString);
    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)); 
    return `${diffDays} hari`;
};

const DetailItem = ({ label, value }) => (
    <div className="flex justify-between border-b border-gray-100 py-1.5 gap-4">
        <span className="text-gray-500 font-medium text-[11px] whitespace-nowrap uppercase tracking-tighter">{label}:</span>
        <span className="font-bold text-xs text-gray-800 text-right">{value || '-'}</span>
    </div>
);

// --- Sub-Components ---

const AssetDetailCard = ({ assetData, managerData }) => {
    if (!assetData || !managerData) return (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2"><Info size={14}/> Menunggu Identifikasi Aset</p>
            <p className="text-[11px] text-amber-700/70 mt-1">Silahkan scan QR atau ketik kode aset untuk memvalidasi ketersediaan barang.</p>
        </div>
    );
    return (
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 mb-6 animate-in fade-in duration-300">
            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2 border-b border-blue-100 pb-2">
                <Box size={14} /> Informasi Aset Terpilih
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                <DetailItem label="Nama Aset" value={assetData.nama_barang} />
                <DetailItem label="Kode Aset" value={assetData.kode_barang} />
                <DetailItem label="P. Jawab Aset" value={managerData.nama_pegawai} />
                <DetailItem label="Kondisi" value={assetData.kondisi?.toUpperCase()} />
            </div>
        </div>
    );
};

const LoanFormModal = ({ isOpen, onClose, assets, users, onSave }) => {
    const defaultForm = { 
        id_barang: '', 
        id_penanggungjawab: '', 
        pj_nama: '', 
        tanggal_pinjam: new Date().toISOString().split('T')[0], 
        tanggal_rencana_kembali: '', 
    };

    const [form, setForm] = useState(defaultForm);
    const [assetCodeInput, setAssetCodeInput] = useState('');
    const [assetFound, setAssetFound] = useState(null);
    const [suggestions, setSuggestions] = useState([]); // Saran Aset (Kode/Nama)
    const [userSuggestions, setUserSuggestions] = useState([]); // Saran Peminjam
    const [isAssetAvailable, setIsAssetAvailable] = useState(true);
    const [statusMessage, setStatusMessage] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    
    useEffect(() => { 
        if (isOpen) { 
            setForm(defaultForm); 
            setAssetCodeInput(''); 
            setAssetFound(null); 
            setSuggestions([]); 
            setUserSuggestions([]); 
            setIsAssetAvailable(true); 
            setStatusMessage(''); 
        } 
    }, [isOpen]); 
    
    const selectedAsset = useMemo(() => assetFound, [assetFound]);
    const selectedManager = useMemo(() => selectedAsset ? users.find(u => u.id_penanggungjawab == selectedAsset.id_penanggungjawab) : null, [selectedAsset, users]);
    
    // --- Autocomplete Aset Logic (Pencarian Kode atau Nama) ---
    const handleAssetInputChange = (e) => {
        const val = e.target.value;
        setAssetCodeInput(val);
        if (val.length > 1) {
            const filtered = assets.filter(a => 
                a.kode_barang.toLowerCase().includes(val.toLowerCase()) || 
                a.nama_barang.toLowerCase().includes(val.toLowerCase())
            );
            setSuggestions(filtered.slice(0, 5));
        } else {
            setSuggestions([]);
        }
    };

    // --- Autocomplete Peminjam Logic ---
    const handleUserInputChange = (e) => {
        const val = e.target.value;
        setForm({ ...form, pj_nama: val, id_penanggungjawab: '' }); // Reset ID saat mengetik ulang
        if (val.length > 0) {
            const filtered = users.filter(u => u.nama_pegawai.toLowerCase().includes(val.toLowerCase()));
            setUserSuggestions(filtered.slice(0, 5));
        } else {
            setUserSuggestions([]);
        }
    };

    const findAssetByData = (asset) => {
        setAssetFound(null); 
        setForm(prev => ({ ...prev, id_barang: '' })); 
        setIsAssetAvailable(true); 
        setStatusMessage('');

        if (asset) {
            const isValid = (asset.status === 'tersedia');
            setIsAssetAvailable(isValid);
            setStatusMessage(isValid ? `✅ Aset TERSEDIA.` : `❌ Aset ${asset.status.toUpperCase()}.`);
            setAssetFound(asset); 
            setAssetCodeInput(asset.nama_barang); // Tampilkan Nama Barang di input setelah pilih
            if (isValid) setForm(prev => ({ ...prev, id_barang: String(asset.id_barang) }));
        }
    };

    useEffect(() => {
        let scanner;
        if (isScanning) {
            // Berikan delay kecil (100ms) agar React selesai merender 
            // div 'loan-qr-reader' sebelum scanner mencari ID tersebut
            const timer = setTimeout(() => {
                try {
                    scanner = new Html5QrcodeScanner("loan-qr-reader", { 
                        fps: 10, 
                        qrbox: 250,
                        // Tambahkan ini untuk mematikan instruksi teks bawaan library 
                        // yang sering menyebabkan error 'innerText' tersebut
                        showTorchButtonIfSupported: true,
                    });

                    scanner.render((text) => { 
                        const found = assets.find(a => a.kode_barang.toLowerCase() === text.toLowerCase());
                        if(found) findAssetByData(found);
                        setIsScanning(false); 
                        scanner.clear(); 
                    }, (error) => {
                        // Abaikan error console log scan yang tidak perlu
                    });
                } catch (err) {
                    console.error("Scanner initialization failed", err);
                }
            }, 100); // Delay 100ms

            return () => {
                clearTimeout(timer);
                if (scanner) {
                    scanner.clear().catch(error => console.error("Failed to clear scanner", error));
                }
            };
        }
    }, [isScanning, assets]);

    if (!isOpen) return null; 

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[130] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-xl font-black text-gray-800 tracking-tight flex items-center"><Send size={24} className="mr-3 text-blue-600"/> Catat Peminjaman</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 p-2 transition"><X size={24} /></button>
                </div>
                
                <div className="p-6 overflow-y-auto no-scrollbar flex-1 text-left">
                    <AssetDetailCard assetData={selectedAsset} managerData={selectedManager} />
                    
                    <div className="space-y-4">
                        {/* AUTOCOMPLETE ASET (Kode/Nama) */}
                        <div className='relative'>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cari Aset (Kode atau Nama Barang)</label>
                            <div className="flex">
                                <input 
                                    type="text" 
                                    value={assetCodeInput} 
                                    onChange={handleAssetInputChange} 
                                    className="w-full p-2.5 border rounded-l-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 border-gray-200 text-sm font-bold" 
                                    placeholder="Ketik kode (ID-xxx) atau nama barang..." 
                                />
                                <button type="button" onClick={() => setIsScanning(true)} className="px-4 bg-white border border-l-0 border-gray-200 rounded-r-xl hover:bg-gray-100 transition shadow-sm"><QrCode size={20} className="text-gray-600" /></button>
                            </div>
                            
                            {suggestions.length > 0 && (
                                <div className="absolute z-[70] w-full mt-1 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden">
                                    {suggestions.map(a => (
                                        <div 
                                            key={a.id_barang} 
                                            onClick={() => { findAssetByData(a); setSuggestions([]); }} 
                                            className="p-3 hover:bg-blue-600 hover:text-white cursor-pointer border-b last:border-none transition-colors"
                                        >
                                            <div className="text-xs font-bold">{a.nama_barang}</div>
                                            <div className="text-[10px] uppercase opacity-70 font-black">{a.kode_barang}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {statusMessage && <p className={`mt-1.5 text-[10px] font-black uppercase tracking-widest ${isAssetAvailable ? 'text-emerald-600' : 'text-rose-600'}`}>{statusMessage}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {/* AUTOCOMPLETE PEMINJAM */}
                            <div className="relative">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nama Peminjam</label>
                                <input 
                                    type="text" 
                                    value={form.pj_nama} 
                                    onChange={handleUserInputChange} 
                                    className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 border-gray-200 text-sm font-bold" 
                                    placeholder="Cari nama pegawai..." 
                                />
                                {userSuggestions.length > 0 && (
                                    <div className="absolute z-[70] w-full mt-1 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden">
                                        {userSuggestions.map(u => (
                                            <div 
                                                key={u.id_penanggungjawab} 
                                                onClick={() => {
                                                    setForm({ ...form, id_penanggungjawab: String(u.id_penanggungjawab), pj_nama: u.nama_pegawai });
                                                    setUserSuggestions([]);
                                                }} 
                                                className="p-3 hover:bg-blue-600 hover:text-white cursor-pointer border-b last:border-none text-xs font-bold transition-colors"
                                            >
                                                {u.nama_pegawai} <span className="opacity-60 font-normal">({u.divisi})</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Estimasi Tanggal Kembali</label>
                                <input type="date" value={form.tanggal_rencana_kembali} onChange={(e) => setForm({...form, tanggal_rencana_kembali: e.target.value})} required className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 border-gray-200 text-sm font-bold" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-[10px] font-black uppercase text-gray-500 hover:text-gray-700 transition tracking-widest">Batal</button>
                    <button 
                        onClick={() => { if(form.id_barang && form.id_penanggungjawab) { onSave(form); onClose(); } else { toast.error("Lengkapi data peminjaman!"); } }} 
                        disabled={!isAssetAvailable || !form.id_barang || !form.id_penanggungjawab} 
                        className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-100 hover:bg-blue-700 transition disabled:bg-gray-300"
                    >
                        Konfirmasi Pinjam
                    </button>
                </div>
            </div>
            {isScanning && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[130] p-4 backdrop-blur-md">
                    <div className="bg-white p-5 rounded-[2rem] w-full max-w-sm relative animate-in zoom-in-95 duration-200">
                        <button onClick={() => setIsScanning(false)} className="absolute -top-12 right-0 text-white hover:text-red-400 transition"><X size={32}/></button>
                        <div className="text-center mb-4">
                            <h3 className="font-black text-lg text-gray-800 tracking-tight leading-none">Scan QR Aset</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Identifikasi otomatis aset peminjaman</p>
                        </div>
                        <div id="loan-qr-reader" className="overflow-hidden rounded-2xl border-4 border-gray-100"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ReturnModal = ({ isOpen, onClose, loanData, onConfirmReturn }) => {
    const [kondisi, setKondisi] = useState('baik');
    if (!isOpen || !loanData) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 text-left">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><Home size={32} /></div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight text-center mb-2">Konfirmasi Pengembalian</h3>
                <p className="text-[12px] text-gray-400 font-medium text-center mb-6">Pastikan kondisi fisik aset sudah diperiksa sebelum disimpan kembali ke sistem.</p>
                
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Aset Dikembalikan</p>
                    <p className="font-bold text-gray-800 text-sm leading-tight">{loanData.barang?.nama_barang}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 italic">Peminjam: {loanData.penanggungjawab?.nama_pegawai}</p>
                </div>

                <div className="mb-8">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Kondisi Akhir Barang</label>
                    <select value={kondisi} onChange={e => setKondisi(e.target.value)} className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 border-gray-200 text-sm font-bold">
                        <option value="baik">Kondisi Baik</option>
                        <option value="rusak ringan">Rusak Ringan</option>
                        <option value="rusak berat">Rusak Berat</option>
                    </select>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition tracking-widest">Batal</button>
                    <button onClick={() => onConfirmReturn({ id_peminjaman: loanData.id_peminjaman, tanggal_kembali: new Date().toISOString().split('T')[0], kondisi_kembali: kondisi })} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition">Proses Kembali</button>
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---
const ManajemenPeminjaman = () => {
    const [assets, setAssets] = useState([]);
    const [users, setUsers] = useState([]);
    const [loans, setLoans] = useState([]);
    const [returnedLoans, setReturnedLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
    const [selectedActiveItem, setSelectedActiveItem] = useState(null);

    const [activePage, setActivePage] = useState(1);
    const [activePerPage, setActivePerPage] = useState(5);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPerPage, setHistoryPerPage] = useState(5);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resA, resU, resL, resR] = await Promise.all([
                api.get(BARANG_PATH), api.get(PJ_PATH), api.get(PEMINJAMAN_PATH), api.get(PENGEMBALIAN_PATH)
            ]);
            setAssets(resA.data.data || []);
            setUsers(resU.data.data || []);
            const allLoans = resL.data.data || [];
            const allReturns = resR.data.data || [];
            
            setLoans(allLoans.filter(l => l.status === 'dipinjam'));
            setReturnedLoans(allLoans.filter(l => l.status === 'dikembalikan').map(l => ({
                ...l, 
                barang: resA.data.data?.find(a => a.id_barang === l.id_barang) || {},
                penanggungjawab: resU.data.data?.find(u => u.id_penanggungjawab === l.id_penanggungjawab) || {},
                pengembalian: allReturns.find(r => r.id_peminjaman === l.id_peminjaman)
            })));
        } catch (e) { toast.error("Sinkronisasi data gagal"); }
        finally { setTimeout(() => setLoading(false), 500); }
    };

    useEffect(() => { fetchData(); }, []);

    const enrichedActive = useMemo(() => loans.map(l => ({
        ...l, 
        barang: assets.find(a => a.id_barang === l.id_barang) || {},
        penanggungjawab: users.find(u => u.id_penanggungjawab === l.id_penanggungjawab) || {},
        status_display: getLoanStatus(l.status, l.tanggal_rencana_kembali)
    })).filter(l => 
        l.barang?.nama_barang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.penanggungjawab?.nama_pegawai?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.barang?.kode_barang?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [loans, assets, users, searchTerm]);

    const totalActive = enrichedActive.length;
    const totalActivePages = Math.ceil(totalActive / activePerPage);
    const startActiveIdx = (activePage - 1) * activePerPage;
    const currentActive = enrichedActive.slice(startActiveIdx, startActiveIdx + activePerPage);

    const enrichedHistory = useMemo(() => returnedLoans.sort((a,b) => b.id_peminjaman - a.id_peminjaman), [returnedLoans]);
    const totalHistory = enrichedHistory.length;
    const totalHistoryPages = Math.ceil(totalHistory / historyPerPage);
    const startHistoryIdx = (historyPage - 1) * historyPerPage;
    const currentHistory = enrichedHistory.slice(startHistoryIdx, startHistoryIdx + historyPerPage);

    const handleNewLoan = async (p) => {
        const loadToast = toast.loading("Mencatat peminjaman...");
        try { await api.post(PEMINJAMAN_PATH, p); toast.success("Peminjaman berhasil!", { id: loadToast }); fetchData(); } catch (e) { toast.error("Gagal mencatat", { id: loadToast }); }
    };

    const handleReturn = async (p) => {
        const loadToast = toast.loading("Mencatat pengembalian...");
        try { await api.post(PENGEMBALIAN_PATH, p); toast.success("Barang dikembalikan!", { id: loadToast }); setIsReturnModalOpen(false); fetchData(); } catch (e) { toast.error("Gagal memproses", { id: loadToast }); }
    };

    

    return (
        <div className="p-4 lg:p-5 min-h-screen text-left">
            <Toaster position="top-right" />
            
            {/* HEADER */}
            <div className="mb-6">
                <h2 className="text-xl lg:text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 leading-none">Manajemen Peminjaman</h2>
                <p className="text-[12px] text-gray-400 font-medium mt-1">Lacak aset yang keluar-masuk dan pantau tenggat waktu pengembalian secara efisien.</p>
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-80">
                    <input type="text" placeholder="Cari aset atau peminjam..." className="pl-9 pr-4 py-1.5 w-full border border-gray-200 rounded-lg bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setActivePage(1); }} />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <button onClick={() => setIsLoanModalOpen(true)} className="w-full md:w-auto flex items-center justify-center bg-blue-600 text-white px-5 py-2 rounded-lg shadow-lg shadow-blue-100 hover:bg-blue-700 transition text-[10px] font-black uppercase tracking-widest"><Plus size={16} className="mr-2"/> Catat Peminjaman Baru</button>
            </div>

            {/* TABEL PEMINJAMAN AKTIF */}
            <div className="mb-10">
                <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center uppercase tracking-[0.2em]"><Clock size={18} className="mr-2 text-blue-600"/> Peminjaman Aktif</h3>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full text-left border-separate border-spacing-y-2 min-w-[950px] px-4 sm:px-0">
                        <thead><tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em]">
                            <th className="px-4 py-2">Aset</th><th className="px-4 py-2">Peminjam</th><th className="px-4 py-2">Tgl Pinjam</th><th className="px-4 py-2">Target Kembali</th><th className="px-4 py-2 text-center">Status</th><th className="px-4 py-2 text-right">Aksi</th>
                        </tr></thead>
                        <tbody className="text-sm">
                            {loading ? (
                                <tr><td colSpan="6" className="py-16 text-center bg-white rounded-2xl border shadow-sm"><Loader2 className="animate-spin h-6 w-6 text-blue-600 mx-auto mb-2" /><span className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Memuat Data Aktif...</span></td></tr>
                            ) : currentActive.length > 0 ? currentActive.map(l => (
                                <tr key={l.id_peminjaman} className="bg-white shadow-sm hover:shadow-md hover:ring-1 hover:ring-blue-100 transition-all cursor-pointer group" onClick={() => setSelectedActiveItem(l)}>
                                    <td className="px-4 py-3 rounded-l-xl">
                                        <div className="font-bold text-gray-800 leading-tight">{l.barang?.nama_barang}</div>
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{l.barang?.kode_barang}</div>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-gray-600">{l.penanggungjawab?.nama_pegawai}</td>
                                    <td className="px-4 py-3 text-gray-500 font-medium">{formatDate(l.tanggal_pinjam)}</td>
                                    <td className="px-4 py-3 text-rose-500 font-bold">{formatDate(l.tanggal_rencana_kembali)}</td>
                                    <td className="px-4 py-3 text-center">{getStatusBadge(l.status_display)}</td>
                                    <td className="px-4 py-3 rounded-r-xl text-right" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => { setSelectedLoan(l); setIsReturnModalOpen(true); }} className="text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md shadow-emerald-50 transition">Kembalikan</button>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="6" className="py-12 text-center text-gray-400 text-[10px] font-black uppercase bg-white border rounded-2xl">Tidak ada aset yang sedang dipinjam.</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION AKTIF */}
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4"> 
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {totalActive === 0 ? 'Data Kosong' : `Showing ${startActiveIdx + 1}-${Math.min(totalActive, startActiveIdx + activePerPage)} of ${totalActive}`}
                    </div>
                    <div className="flex items-center gap-3">
                        <select value={activePerPage} onChange={(e) => { setActivePerPage(Number(e.target.value)); setActivePage(1); }} className="px-2 py-1 border border-gray-200 rounded text-[10px] font-black bg-white outline-none">
                            {ITEMS_PER_PAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} / page</option>)}
                        </select>
                        <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white">
                            <button onClick={() => setActivePage(p => Math.max(p - 1, 1))} disabled={activePage === 1} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-r transition"><ChevronLeft size={14}/></button>
                            <span className="px-3 py-1 text-[11px] font-black text-blue-600 bg-blue-50/50">{activePage}</span>
                            <button onClick={() => setActivePage(p => Math.min(p + 1, totalActivePages))} disabled={activePage === totalActivePages || totalActivePages === 0} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-l transition"><ChevronRight size={14}/></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABEL RIWAYAT */}
            <div>
                <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center uppercase tracking-[0.2em]"><History size={18} className="mr-2 text-orange-500"/> Riwayat Peminjaman</h3>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full text-left border-separate border-spacing-y-2 min-w-[950px] px-4 sm:px-0">
                        <thead><tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em]">
                            <th className="px-4 py-2">Aset</th><th className="px-4 py-2">Eks Peminjam</th><th className="px-4 py-2">Tgl Pinjam</th><th className="px-4 py-2">Tgl Kembali</th><th className="px-4 py-2 text-center">Durasi</th><th className="px-4 py-2 text-right">Kondisi Akhir</th>
                        </tr></thead>
                        <tbody className="text-sm">
                            {loading ? (
                                <tr><td colSpan="6" className="py-16 text-center bg-white rounded-2xl border shadow-sm"><Loader2 className="animate-spin h-6 w-6 text-blue-600 mx-auto mb-2" /></td></tr>
                            ) : currentHistory.length > 0 ? currentHistory.map(l => (
                                <tr key={l.id_peminjaman} className="bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => setSelectedHistoryItem(l)}>
                                    <td className="px-4 py-3 rounded-l-xl">
                                        <div className="font-bold text-gray-600 leading-tight">{l.barang?.nama_barang}</div>
                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{l.barang?.kode_barang}</div>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-gray-500">{l.penanggungjawab?.nama_pegawai}</td>
                                    <td className="px-4 py-3 text-gray-400 text-xs font-medium">{formatDate(l.tanggal_pinjam)}</td>
                                    <td className="px-4 py-3 text-emerald-600 font-bold">{formatDate(l.pengembalian?.tanggal_kembali)}</td>
                                    <td className="px-4 py-3 text-center text-[11px] font-bold text-gray-400">{calculateDuration(l.tanggal_pinjam, l.pengembalian?.tanggal_kembali)}</td>
                                    <td className="px-4 py-3 rounded-r-xl text-right">
                                        <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border bg-blue-50 text-blue-600 border-blue-100">{l.pengembalian?.kondisi_kembali}</span>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="6" className="py-12 text-center text-gray-400 text-[10px] font-black uppercase bg-white border rounded-2xl">Belum ada riwayat pengembalian.</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION RIWAYAT */}
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4"> 
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total {totalHistory} riwayat terekam</div>
                    <div className="flex items-center gap-3">
                        <select value={historyPerPage} onChange={(e) => { setHistoryPerPage(Number(e.target.value)); setHistoryPage(1); }} className="px-2 py-1 border border-gray-200 rounded text-[10px] font-black bg-white outline-none">
                            {ITEMS_PER_PAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} / page</option>)}
                        </select>
                        <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white">
                            <button onClick={() => setHistoryPage(p => Math.max(p - 1, 1))} disabled={historyPage === 1} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-r transition"><ChevronLeft size={14}/></button>
                            <span className="px-3 py-1 text-[11px] font-black text-orange-600 bg-orange-50/50">{historyPage}</span>
                            <button onClick={() => setHistoryPage(p => Math.min(p + 1, totalHistoryPages))} disabled={historyPage === totalHistoryPages || totalHistoryPages === 0} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-l transition"><ChevronRight size={14}/></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <LoanFormModal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} assets={assets} users={users} onSave={handleNewLoan} />
            <ReturnModal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} loanData={selectedLoan} onConfirmReturn={handleReturn} />
            
            {/* Modal Detail Aktif */}
            {selectedActiveItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-left border border-white/20">
                        <div className="bg-gray-50 p-6 border-b flex justify-between items-center relative overflow-hidden">
                            <div className="text-left relative z-10">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.2em] mb-2 inline-block">Transaksi Aktif</span>
                                <h2 className="text-xl font-black text-gray-800 leading-tight">{selectedActiveItem.barang?.nama_barang}</h2>
                            </div>
                            <button onClick={() => setSelectedActiveItem(null)} className="bg-white p-2 rounded-full shadow hover:text-red-500 transition relative z-10"><X size={18}/></button>
                        </div>
                        <div className="p-8 space-y-2">
                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><ClipboardList size={12}/> Detail Peminjaman</h3>
                            <DetailItem label="Kode Aset" value={selectedActiveItem.barang?.kode_barang} />
                            <DetailItem label="Peminjam" value={selectedActiveItem.penanggungjawab?.nama_pegawai} />
                            <DetailItem label="Tanggal Pinjam" value={formatDate(selectedActiveItem.tanggal_pinjam)} />
                            <DetailItem label="Tenggat Kembali" value={formatDate(selectedActiveItem.tanggal_rencana_kembali)} />
                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center mt-6 shadow-inner">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Status Saat Ini</p>
                                <p className="text-amber-700 font-black text-sm uppercase">{selectedActiveItem.status_display}</p>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t flex justify-end gap-2">
                            <button onClick={() => { setSelectedActiveItem(null); setSelectedLoan(selectedActiveItem); setIsReturnModalOpen(true); }} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition">Proses Kembali</button>
                            <button onClick={() => setSelectedActiveItem(null)} className="px-6 py-2.5 bg-gray-800 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition">Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detail Riwayat */}
            {selectedHistoryItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-left">
                        <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
                            <div className="text-left">
                                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.2em] mb-2 inline-block leading-none">Arsip Transaksi</span>
                                <h2 className="text-xl font-black text-gray-800 tracking-tight leading-none">{selectedHistoryItem.barang?.nama_barang}</h2>
                            </div>
                            <button onClick={() => setSelectedHistoryItem(null)} className="bg-white p-2 rounded-full shadow hover:text-red-500 transition"><X size={18}/></button>
                        </div>
                        <div className="p-8 space-y-2">
                            <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><History size={12}/> Log Peminjaman Lampau</h3>
                            <DetailItem label="Kode Aset" value={selectedHistoryItem.barang?.kode_barang} />
                            <DetailItem label="Eks Peminjam" value={selectedHistoryItem.penanggungjawab?.nama_pegawai} />
                            <DetailItem label="Tanggal Pinjam" value={formatDate(selectedHistoryItem.tanggal_pinjam)} />
                            <DetailItem label="Tanggal Kembali" value={formatDate(selectedHistoryItem.pengembalian?.tanggal_kembali)} />
                            <DetailItem label="Kondisi Akhir" value={selectedHistoryItem.pengembalian?.kondisi_kembali?.toUpperCase()} />
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center mt-6 shadow-inner">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Durasi Total</p>
                                <p className="text-blue-700 font-black text-sm uppercase">{calculateDuration(selectedHistoryItem.tanggal_pinjam, selectedHistoryItem.pengembalian?.tanggal_kembali)}</p>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t flex justify-end">
                            <button onClick={() => setSelectedHistoryItem(null)} className="px-10 py-2.5 bg-gray-800 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition">Tutup Detail</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManajemenPeminjaman;