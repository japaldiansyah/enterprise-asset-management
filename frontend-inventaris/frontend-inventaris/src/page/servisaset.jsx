import React, { useState, useMemo, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../api/axiosConfig'; 
import { useSearchParams } from 'react-router-dom';

import { 
    Search, Loader2, Box, CheckCircle, Clock, PlusCircle, 
    QrCode, X, Info, History, DollarSign, ChevronLeft, ChevronRight,
    Wrench, ClipboardList, AlertTriangle
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode'; 

const PEMELIHARAAN_PATH = '/pemeliharaan';
const BARANG_PATH = '/barang';
const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(numAmount);
};

const formatNumberInput = (num) => {
    if (!num) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseNumberInput = (str) => {
    return str.replace(/\./g, "");
};

// --- ISO 55000 DECISION LOGIC (40, 25, 20, 15) ---
const analyzeAssetHealth = (data, currentCost) => {
    if (!data) return null;

    const WEIGHTS = { ECONOMY: 40, PERFORMANCE: 25, RISK: 20, AVAILABILITY: 15 };
    let score = 0;
    let reasons = [];
    let isCritical = false;

    const repairCost = Number(currentCost);
    const purchasePrice = data.purchasePrice;
    
    const currentRepairRatio = repairCost / purchasePrice;
    if (currentRepairRatio >= 0.8) {
        isCritical = true;
        reasons.push(`CRITICAL: Biaya perbaikan tunggal telah mencapai 80% dari nilai perolehan.`);
    }

    const totalMaintenanceCost = data.cumulativeCost + repairCost;
    const totalCostRatio = totalMaintenanceCost / purchasePrice;
    
    if (totalCostRatio >= 0.7) {
        score += WEIGHTS.ECONOMY;
        reasons.push(`EKONOMI: Total akumulasi biaya servis mencapai ${(totalCostRatio * 100).toFixed(0)}% dari harga aset.`);
    }

    if (data.serviceCountYearly >= 3) {
        score += WEIGHTS.PERFORMANCE;
        reasons.push("KINERJA: Aset terlalu sering rusak (Low Reliability).");
    }

    if (data.currentAge >= data.usefulLife) {
        score += WEIGHTS.RISK;
        reasons.push(`RISIKO: Aset sudah melewati masa manfaat teknis.`);
    }

    if (!data.hasBackup) {
        score += WEIGHTS.AVAILABILITY;
        reasons.push("LOGISTIK: Tidak tersedia unit cadangan (High Downtime Risk).");
    }

    const shouldReplace = isCritical || score >= 60;

    return {
        score: isCritical ? 100 : Math.min(score, 100),
        recommendation: shouldReplace ? 'GANTI (DISPOSAL)' : 'PERBAIKI (REPAIR)',
        isReplace: shouldReplace,
        reasons
    };
};

const initialFormState = {
    id_barang: '', jenis_perbaikan: '', vendor: '', biaya: '',
    tanggal: new Date().toISOString().split('T')[0], keterangan: ''
};

const DetailItem = ({ label, value }) => (
    <div className="flex justify-between border-b border-gray-100 py-1.5 gap-4 text-left">
        <span className="text-gray-500 font-medium text-xs whitespace-nowrap">{label}:</span>
        <span className="font-bold text-xs text-gray-800 text-right">{value || '-'}</span>
    </div>
);

const RiwayatServiceAsset = () => {
    const [maintenances, setMaintenances] = useState([]);
    const [assets, setAssets] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmData, setConfirmData] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [form, setForm] = useState(initialFormState);
    const [assetCodeInput, setAssetCodeInput] = useState(''); 
    const [assetFound, setAssetFound] = useState(null); 
    const [suggestions, setSuggestions] = useState([]); 
    const [isAssetAvailable, setIsAssetAvailable] = useState(true); 
    const [statusMessage, setStatusMessage] = useState(''); 
    
    const [isScanning, setIsScanning] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null); 

    const [searchParams, setSearchParams] = useSearchParams();

    const getAssetName = (id) => {
        const asset = assets.find(a => String(a.id_barang) === String(id)); 
        return asset ? asset.nama_barang : `Aset #${id}`;
    };

    const getAssetCode = (id) => {
        const asset = assets.find(a => String(a.id_barang) === String(id)); 
        return asset ? asset.kode_barang : '-';
    };
    
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [maintRes, assetsRes] = await Promise.all([
                api.get(PEMELIHARAAN_PATH),
                api.get(BARANG_PATH)
            ]);
            setMaintenances(maintRes.data.data || []); 
            setAssets(assetsRes.data.data || []);
        } catch (error) { 
            toast.error("Gagal memuat data."); 
        } finally { 
            setTimeout(() => setIsLoading(false), 500); 
        }
    };

    useEffect(() => { fetchData(); }, []);

    const decisionInsight = useMemo(() => 
        analyzeAssetHealth(assetFound?.decision_data, form.biaya),
    [assetFound, form.biaya]);

    const filteredData = useMemo(() => {
        return maintenances.filter(item => {
            const search = searchTerm.toLowerCase();
            return getAssetName(item.id_barang).toLowerCase().includes(search) || 
                   getAssetCode(item.id_barang).toLowerCase().includes(search) ||
                   item.vendor?.toLowerCase().includes(search);
        }).sort((a, b) => {
            if (a.status_pemeliharaan === 'proses' && b.status_pemeliharaan !== 'proses') return -1;
            if (a.status_pemeliharaan !== 'proses' && b.status_pemeliharaan === 'proses') return 1;
            return b.id_pemeliharaan - a.id_pemeliharaan;
        });
    }, [maintenances, searchTerm, assets]);

    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredData.slice(startIndex, startIndex + itemsPerPage);

    const paginate = (n) => { if (n > 0 && n <= totalPages) setCurrentPage(n); };

    const selectAsset = async (asset) => {
        setIsLoading(true);
        try {
            const res = await api.get(`${BARANG_PATH}/${asset.id_barang}`);
            const fullAssetData = res.data.data;
            
            setAssetFound(fullAssetData);
            setAssetCodeInput(fullAssetData.kode_barang);
            setSuggestions([]);

            // GUARD LOGIC: Validasi Status Aset
            if (fullAssetData.status === 'tersedia') {
                setIsAssetAvailable(true);
                setStatusMessage(`✅ Aset tersedia untuk servis.`);
                setForm(prev => ({ 
                    ...initialFormState, 
                    id_barang: String(fullAssetData.id_barang), 
                    tanggal: prev.tanggal 
                }));
            } else if (fullAssetData.status === 'diperbaiki') {
                setIsAssetAvailable(false);
                setStatusMessage(`⚠️ Aset ini sedang dalam proses perbaikan.`);
            } else {
                setIsAssetAvailable(false);
                setStatusMessage(`❌ Aset berstatus ${fullAssetData.status.toUpperCase()}. (Hanya status TERSEDIA yang dapat diservis)`);
            }
        } catch (err) {
            toast.error("Gagal mengambil detail aset.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssetCodeChange = (e) => {
        const code = e.target.value; 
        setAssetCodeInput(code);
        if (!code) { 
            setAssetFound(null); setSuggestions([]); setStatusMessage(''); 
            return; 
        } 
        const found = assets.filter(a => 
            a.kode_barang?.toLowerCase().includes(code.toLowerCase()) || 
            a.nama_barang?.toLowerCase().includes(code.toLowerCase())
        ).slice(0, 5);
        setSuggestions(found);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const loadToast = toast.loading("Menyimpan data...");
        setIsSaving(true);
        try {
            await api.post(PEMELIHARAAN_PATH, { 
                ...form, 
                id_barang: parseInt(form.id_barang), 
                biaya: Number(form.biaya) 
            });
            toast.success("Pemeliharaan berhasil dicatat!", { id: loadToast });
            setForm(initialFormState); setAssetCodeInput(''); setAssetFound(null); setStatusMessage('');
            fetchData();
        } catch (err) { 
            toast.error("Gagal menyimpan data.", { id: loadToast }); 
        } finally { setIsSaving(false); }
    };

    const executeServiceDone = async () => {
        const loadToast = toast.loading("Menyelesaikan servis...");
        setIsConfirmOpen(false);
        try {
            await api.patch(`${PEMELIHARAAN_PATH}/${confirmData.id_pemeliharaan}/selesai`, { id_barang: confirmData.id_barang });
            toast.success("Servis selesai, aset tersedia!", { id: loadToast });
            fetchData();
        } catch (error) { 
            toast.error("Gagal update status.", { id: loadToast }); 
        }
    };

    useEffect(() => {
        let scanner;
        if (isScanning) {
            scanner = new Html5QrcodeScanner("qr-service", { fps: 10, qrbox: 250 });
            scanner.render((text) => { 
                const asset = assets.find(a => a.kode_barang?.toLowerCase() === text.toLowerCase());
                if(asset) selectAsset(asset);
                setIsScanning(false);
                scanner.clear();
            }, () => {});
        }
        return () => { if (scanner) scanner.clear().catch(() => {}); };
    }, [isScanning, assets]);

    // --- SINKRONISASI MODAL DENGAN URL ---
    useEffect(() => {
        const idParam = searchParams.get("id");
        if (idParam && maintenances.length > 0) {
            const found = maintenances.find(m => String(m.id_pemeliharaan) === idParam);
            if (found) {
                setSelectedItem(found);
            }
        }
    }, [searchParams, maintenances]);

    // Fungsi untuk menutup modal sekaligus membersihkan URL
    const closeDetail = () => {
        setSelectedItem(null);
        setSearchParams({}); // Menghapus ?id=... di URL
    };

    return (
        <div className="p-4 lg:p-5 min-h-screen text-left">
            <Toaster position="top-right" />
            
            {/* HEADER */}
            <div className="mb-6 text-left">
                <h2 className="text-xl lg:text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 leading-none">
                    Manajemen Servis Aset
                    {isSaving && <Loader2 className="animate-spin text-emerald-600" size={20} />}
                </h2>
                <p className="text-[12px] text-gray-400 font-medium mt-1">Perbaiki aset rusak dan pantau aset yang sedang dalam perbaikan</p>
            </div>

            {/* FORM SECTION */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 mb-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16"></div>
                
                <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-gray-800 relative z-10">
                    <Wrench size={16} className="text-emerald-600"/> Catat Pemeliharaan Baru
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-5 relative z-10 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="relative">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Identifikasi Aset</label>
                            <div className="relative flex">
                                <input 
                                    type="text" value={assetCodeInput} onChange={handleAssetCodeChange} 
                                    placeholder="Ketik kode atau nama..." 
                                    className="pl-9 pr-4 py-2 text-sm w-full rounded-l-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm bg-gray-50/50 transition-all" 
                                />
                                <Box className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <button type="button" onClick={() => setIsScanning(true)} className="px-3 bg-white border border-l-0 border-gray-200 rounded-r-xl hover:bg-gray-50 transition text-gray-600 shadow-sm">
                                    <QrCode size={18} />
                                </button>
                            </div>
                            {suggestions.length > 0 && (
                                <ul className="absolute z-[110] w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                    {suggestions.map(a => (
                                        <li key={a.id_barang} className="p-3 hover:bg-emerald-50 cursor-pointer text-xs border-b last:border-none flex flex-col transition-colors"
                                            onClick={() => selectAsset(a)}>
                                            <span className="font-bold text-gray-800">{a.nama_barang}</span>
                                            <span className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter">{a.kode_barang}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {statusMessage && <p className={`mt-1.5 text-[9px] font-black uppercase tracking-widest ${isAssetAvailable ? 'text-emerald-600' : 'text-rose-600'}`}>{statusMessage}</p>}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Biaya Perbaikan (IDR)</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px]">RP</div>
                                <input 
                                    type="text" className={`w-full border p-2 pl-9 text-sm rounded-xl outline-none shadow-sm transition-all ${!isAssetAvailable ? 'bg-gray-100 border-gray-200' : 'bg-gray-50/50 border-gray-200 focus:ring-2 focus:ring-emerald-500'}`}
                                    value={formatNumberInput(form.biaya)} disabled={!isAssetAvailable}
                                    onChange={(e) => { const val = parseNumberInput(e.target.value); if(!isNaN(val)) setForm({...form, biaya: val}); }}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* DECISION ANALYSIS CARD */}
                    {decisionInsight && form.biaya > 0 && (
                        <div className={`p-5 rounded-[1.5rem] border-2 animate-in slide-in-from-top-2 duration-300 ${decisionInsight.isReplace ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${decisionInsight.isReplace ? 'text-rose-600' : 'text-emerald-600'} flex items-center gap-2`}>
                                    <AlertTriangle size={14}/> Rekomendasi Keputusan
                                </h4>
                                
                            </div>
                            <p className="text-lg font-black text-gray-800 mb-3 leading-tight">
                                Saran: {decisionInsight.recommendation}
                            </p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {decisionInsight.reasons.map((r, i) => (
                                    <li key={i} className="text-[10px] font-bold text-gray-500 flex items-center gap-2">
                                        <div className={`w-1 h-1 rounded-full ${decisionInsight.isReplace ? 'bg-rose-400' : 'bg-emerald-400'}`}></div>
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* CURRENT INFO PANEL */}
                    <div className={`p-4 rounded-2xl border border-dashed transition-all ${assetFound ? 'bg-gray-50 border-gray-200' : 'bg-gray-50/50 border-gray-100'}`}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Merk/Tipe</p><p className="text-xs font-bold text-gray-800 truncate">{assetFound?.merk || '-'}</p></div>
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Nilai Buku (NBV)</p><p className="text-xs font-black text-emerald-600">{assetFound ? formatCurrency(assetFound.nilai_nbv) : '-'}</p></div>
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Biaya Servis</p><p className="text-xs font-bold text-gray-800">{assetFound ? formatCurrency(assetFound.decision_data?.cumulativeCost) : '-'}</p></div>
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Status Akhir</p><p className="text-xs font-bold text-gray-800 uppercase">{assetFound?.status || '-'}</p></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Jenis Perbaikan</label>
                            <input type="text" className={`w-full border p-2 text-sm rounded-xl outline-none shadow-sm transition-all ${!isAssetAvailable ? 'bg-gray-100 border-gray-200' : 'bg-gray-50/50 border-gray-200 focus:ring-2 focus:ring-emerald-500'}`} value={form.jenis_perbaikan} onChange={e => setForm({...form, jenis_perbaikan: e.target.value})} disabled={!isAssetAvailable} required placeholder="Cth: Ganti Aki / LCD"/>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Vendor / Bengkel</label>
                            <input type="text" className={`w-full border p-2 text-sm rounded-xl outline-none shadow-sm transition-all ${!isAssetAvailable ? 'bg-gray-100 border-gray-200' : 'bg-gray-50/50 border-gray-200 focus:ring-2 focus:ring-emerald-500'}`} value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} disabled={!isAssetAvailable} required placeholder="Pihak Ketiga"/>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Tanggal Mulai</label>
                            <input type="date" className={`w-full border p-2 text-sm rounded-xl outline-none shadow-sm transition-all ${!isAssetAvailable ? 'bg-gray-100 border-gray-200' : 'bg-gray-50/50 border-gray-200 focus:ring-2 focus:ring-emerald-500'}`} value={form.tanggal} onChange={e => setForm({...form, tanggal: e.target.value})} disabled={!isAssetAvailable} required/>
                        </div>
                    </div>

                    {/* FIELD KETERANGAN */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Keterangan Pemeliharaan
                            </label>
                            {/* PENANDA HURUF */}
                            <span className={`text-[9px] font-bold uppercase tracking-tighter ${form.keterangan.length >= 200 ? 'text-rose-500' : 'text-gray-400'}`}>
                                {form.keterangan.length} / 200
                            </span>
                        </div>
                        
                        <textarea 
                            className={`w-full border p-3 text-sm rounded-xl outline-none shadow-sm transition-all min-h-[100px] resize-none ${
                                !isAssetAvailable 
                                ? 'bg-gray-100 border-gray-200' 
                                : 'bg-gray-50/50 border-gray-200 focus:ring-2 focus:ring-emerald-500'
                            } ${form.keterangan.length >= 200 ? 'border-rose-300 ring-1 ring-rose-100' : ''}`}
                            placeholder="Detail perbaikan atau sparepart yang diganti..."
                            value={form.keterangan}
                            disabled={!isAssetAvailable}
                            maxLength={200} // MEMBATASI INPUT MAKSIMAL 200
                            onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                        />
                        
                        {/* PESAN PERINGATAN (OPSIONAL) */}
                        {form.keterangan.length >= 200 && (
                            <p className="text-[9px] text-rose-500 font-bold mt-1 uppercase animate-pulse">
                                Batas maksimal karakter tercapai
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end pt-3 border-t border-gray-100">
                        <button type="submit" disabled={!isAssetAvailable || isSaving || !assetFound} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition disabled:bg-gray-300 disabled:shadow-none flex items-center gap-2">
                            {isSaving ? <Loader2 className="animate-spin" size={14}/> : <PlusCircle size={14}/>} Simpan Pemeliharaan
                        </button>
                    </div>
                </form>
            </div>

            {/* TABLE SECTION */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 tracking-tight uppercase"><History size={18} className="text-emerald-600"/> Riwayat Servis</h3>
                <div className="relative flex w-full sm:w-72">
                    <input
                        type="text" placeholder="Cari data servis..."
                        className="pl-9 pr-4 py-1.5 w-full rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
                        value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
            </div>

            {/* TABLE CONTENT */}
            <div className="overflow-x-auto mb-4 -mx-4 sm:mx-0">
                <table className="w-full text-left border-separate border-spacing-y-2 min-w-[900px] px-4 sm:px-0">
                    <thead>
                        <tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em]">
                            <th className="px-4 py-2">Informasi Aset</th>
                            <th className="px-4 py-2">Vendor & Perbaikan</th>
                            <th className="px-4 py-2 text-right">Biaya</th>
                            <th className="px-4 py-2 text-center">Status</th>
                            <th className="px-4 py-2 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {isLoading ? (
                            <tr>
                                <td colSpan="5" className="py-20 text-center bg-white rounded-2xl border shadow-sm">
                                    <Loader2 className="animate-spin h-6 w-6 text-emerald-600 mx-auto mb-2" />
                                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Sinkronisasi Data...</span>
                                </td>
                            </tr>
                        ) : currentItems.length > 0 ? (
                            currentItems.map((item) => (
                                <tr key={item.id_pemeliharaan} className="bg-white shadow-sm hover:shadow-md hover:ring-1 hover:ring-emerald-100 transition-all cursor-pointer group" onClick={() => setSelectedItem(item)}>
                                    <td className="px-4 py-4 rounded-l-xl">
                                        <div className="font-bold text-gray-800 leading-tight">{getAssetName(item.id_barang)}</div>
                                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">{getAssetCode(item.id_barang)}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="text-gray-700 font-bold">{item.jenis_perbaikan}</div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{item.vendor}</div>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <span className="font-black text-rose-600">{formatCurrency(item.biaya)}</span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border inline-flex items-center gap-1 ${item.status_pemeliharaan === 'selesai' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                            {item.status_pemeliharaan === 'selesai' ? <CheckCircle size={10}/> : <Clock size={10}/>}
                                            {item.status_pemeliharaan}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 rounded-r-xl text-right" onClick={e => e.stopPropagation()}>
                                        {item.status_pemeliharaan === 'proses' ? (
                                            <button onClick={() => { setConfirmData(item); setIsConfirmOpen(true); }} className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition">Selesai</button>
                                        ) : <span className="text-gray-300 text-[9px] font-black uppercase tracking-widest italic">Archived</span>}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5" className="px-4 py-16 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest bg-white rounded-2xl border">Data pemeliharaan tidak ditemukan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4"> 
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Menampilkan {totalItems === 0 ? 0 : startIndex + 1}-{Math.min(totalItems, startIndex + itemsPerPage)} dari {totalItems} riwayat
                </div>
                <div className="flex items-center gap-3">
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-2 py-1 border border-gray-200 rounded text-[10px] font-black bg-white text-gray-600 outline-none">
                        {ITEMS_PER_PAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} / page</option>)}
                    </select>
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                        <button onClick={() => paginate(currentPage-1)} disabled={currentPage === 1} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-r transition-colors"><ChevronLeft size={14}/></button>
                        <span className="px-3 py-1.5 text-[11px] font-black text-emerald-600 bg-emerald-50/50">{currentPage}</span>
                        <button onClick={() => paginate(currentPage+1)} disabled={currentPage === totalPages} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-l transition-colors"><ChevronRight size={14}/></button>
                    </div>
                </div>
            </div>

            {/* MODAL KONFIRMASI */}
            {isConfirmOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={32} /></div>
                        <h3 className="text-xl font-black text-gray-800 tracking-tight mb-2">Selesaikan Servis?</h3>
                        <p className="text-[12px] text-gray-400 font-medium mb-8">Yakin aset <span className="font-bold text-gray-800">"{getAssetName(confirmData?.id_barang)}"</span> sudah selesai servis?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsConfirmOpen(false)} className="flex-1 py-2.5 text-[10px] font-black uppercase text-gray-500 hover:text-gray-700 transition">Batal</button>
                            <button onClick={executeServiceDone} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition">Ya, Selesai</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-left" onClick={closeDetail}>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20" onClick={e => e.stopPropagation()}>
                        <div className="bg-gray-50 p-6 border-b flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12"></div>
                            <div className="text-left relative z-10 text-black">
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.2em] mb-2 inline-block leading-none">{getAssetCode(selectedItem.id_barang)}</span>
                                <h2 className="text-xl font-black text-gray-800 tracking-tight leading-none">{getAssetName(selectedItem.id_barang)}</h2>
                            </div>
                            <button onClick={closeDetail} className="bg-white p-2 rounded-full shadow-sm border border-gray-100 hover:text-red-500 transition relative z-10"><X size={18}/></button>
                        </div>
                        <div className="p-8 space-y-2">
                            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><ClipboardList size={12}/> Detail Riwayat Servis</h3>
                            <DetailItem label="Jenis Perbaikan" value={selectedItem.jenis_perbaikan} />
                            <DetailItem label="Vendor / Bengkel" value={selectedItem.vendor} />
                            <DetailItem label="Biaya Servis" value={formatCurrency(selectedItem.biaya)} />
                            <DetailItem label="Waktu Servis" value={new Date(selectedItem.tanggal).toLocaleDateString('id-ID', { dateStyle: 'long' })} />
                            
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-6 shadow-inner">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Info size={12}/> Keterangan</p>
                                <p className="text-gray-700 italic text-xs leading-relaxed font-medium">
                                    {selectedItem.keterangan ? `"${selectedItem.keterangan}"` : "Tidak ada catatan tambahan."}
                                </p>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t flex justify-end">
                            <button onClick={closeDetail} className="px-10 py-2.5 bg-gray-800 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition">Tutup Detail</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SCANNER MODAL */}
            {isScanning && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[130] p-4 backdrop-blur-md">
                    <div className="bg-white p-5 rounded-[2rem] w-full max-w-sm relative animate-in zoom-in-95">
                        <button onClick={() => setIsScanning(false)} className="absolute -top-12 right-0 text-white hover:text-red-400 transition"><X size={32}/></button>
                        <div className="text-center mb-4">
                            <h3 className="font-black text-lg text-gray-800 tracking-tight leading-none">Scan QR Aset</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Identifikasi otomatis aset servis</p>
                        </div>
                        <div id="qr-service" className="overflow-hidden rounded-2xl border-4 border-gray-100"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RiwayatServiceAsset;