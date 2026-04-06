import React, { useState, useEffect, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../api/axiosConfig'; 

import { 
    Trash2, Loader2, Search, Calendar, Box, 
    X, QrCode, ChevronLeft, ChevronRight, History, DollarSign,
    Info, AlertTriangle, ClipboardList
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode'; 

const DISPOSAL_PATH = '/penghapusan';
const BARANG_PATH = '/barang';
const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50]; 

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(amount);
};

const formatNumberInput = (num) => {
    if (!num) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseNumberInput = (str) => {
    return str.replace(/\./g, "");
};

const initialFormState = {
    id_barang: '',
    tanggal: new Date().toISOString().split('T')[0],
    alasan: '',
    nilai_residu: '', 
};

const DetailItem = ({ label, value }) => (
    <div className="flex justify-between border-b border-gray-100 py-1.5 gap-4">
        <span className="text-gray-500 font-medium text-xs whitespace-nowrap uppercase tracking-tighter">{label}:</span>
        <span className="font-bold text-xs text-gray-800 text-right">{value || '-'}</span>
    </div>
);

const ManajemenPenghapusanAsset = () => {
    const [disposals, setDisposals] = useState([]);
    const [masterAssets, setMasterAssets] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [form, setForm] = useState(initialFormState);
    const [assetCodeInput, setAssetCodeInput] = useState(''); 
    const [assetFound, setAssetFound] = useState(null); 
    const [suggestions, setSuggestions] = useState([]); 
    const [isAssetRemovable, setIsAssetRemovable] = useState(false); 
    const [statusMessage, setStatusMessage] = useState('');
    
    const [isScanning, setIsScanning] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDisposal, setSelectedDisposal] = useState(null); 
    
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [assetsRes, disposalRes] = await Promise.all([
                api.get(BARANG_PATH),
                api.get(DISPOSAL_PATH)
            ]);
            setMasterAssets(assetsRes.data.data || []);
            const disposalData = (disposalRes.data.data || disposalRes.data).map(item => ({
                ...item,
                barang: item.barang || { nama_barang: 'Aset Dihapus (N/A)', kode_barang: 'N/A' }
            }));
            setDisposals(disposalData);
        } catch (error) {
            toast.error("Gagal memuat data penghapusan.");
        } finally {
            setTimeout(() => setIsLoading(false), 500);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filteredData = useMemo(() => {
        return disposals.filter(item => {
            const searchLower = searchTerm.toLowerCase();
            return item.barang?.nama_barang?.toLowerCase().includes(searchLower) ||
                   item.barang?.kode_barang?.toLowerCase().includes(searchLower);
        }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()); 
    }, [disposals, searchTerm]);

    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredData.slice(startIndex, startIndex + itemsPerPage);

    const paginate = (n) => { if (n > 0 && n <= totalPages) setCurrentPage(n); };

    const selectAsset = (asset) => {
        setAssetFound(asset);
        setAssetCodeInput(asset.kode_barang);
        setSuggestions([]);
        
        if (asset.status === 'dihapus') {
            setIsAssetRemovable(false);
            setStatusMessage(`❌ Barang ini sudah berstatus DIHAPUS.`);
        } else {
            setIsAssetRemovable(true);
            setStatusMessage(`✅ Barang tersedia untuk proses penghapusan.`);
            setForm(prev => ({ ...initialFormState, id_barang: String(asset.id_barang), tanggal: prev.tanggal }));
        }
    };

    const handleDisposalSubmit = async (e) => {
        e.preventDefault();
        const loadToast = toast.loading("Memproses penghapusan aset...");
        setIsSaving(true);
        try {
            await api.post(DISPOSAL_PATH, {
                ...form,
                id_barang: parseInt(form.id_barang),
                nilai_residu: Number(form.nilai_residu || 0)
            });
            toast.success("Penghapusan berhasil dicatat!", { id: loadToast });
            setForm(initialFormState); setAssetCodeInput(''); setAssetFound(null); setStatusMessage('');
            fetchData();
        } catch (err) {
            toast.error("Gagal menyimpan data penghapusan.", { id: loadToast });
        } finally { setIsSaving(false); }
    };

    useEffect(() => {
        let scanner;
        if (isScanning) {
            scanner = new Html5QrcodeScanner("disposal-reader", { fps: 10, qrbox: 250 });
            scanner.render((text) => {
                const asset = masterAssets.find(a => a.kode_barang?.toLowerCase() === text.toLowerCase());
                if (asset) selectAsset(asset);
                else { setAssetCodeInput(text); setStatusMessage("Kode tidak ditemukan"); }
                setIsScanning(false);
                scanner.clear();
            }, () => {});
        }
        return () => { if (scanner) scanner.clear().catch(() => {}); };
    }, [isScanning, masterAssets]);

    return (
        <div className="p-4 lg:p-5 min-h-screen text-left">
            <Toaster position="top-right" />

            {/* HEADER */}
            <div className="mb-6">
                <h2 className="text-xl lg:text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 leading-none">
                    Pelepasan & Penghapusan Aset
                    {isSaving && <Loader2 className="animate-spin text-rose-600" size={20} />}
                </h2>
                <p className="text-[12px] text-gray-400 font-medium mt-1">Proses penghentian penggunaan aset, baik melalui penjualan, rongsok, maupun hibah.</p>
            </div>

            {/* FORM SECTION (RE-SCALED) */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 mb-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16"></div>
                
                <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-gray-800 relative z-10">
                    <Trash2 size={16} className="text-rose-600"/> Pencatatan Aset Keluar
                </h3>

                <form onSubmit={handleDisposalSubmit} className="space-y-5 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="relative">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Identifikasi Aset</label>
                            <div className="relative flex">
                                <input
                                    type="text" value={assetCodeInput} placeholder="Cari nama atau kode barang..."
                                    className="pl-9 pr-4 py-2 text-sm w-full rounded-l-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none transition-all shadow-sm bg-gray-50/50"
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setAssetCodeInput(val);
                                        if (val.length > 0) {
                                            const found = masterAssets.filter(a => 
                                                a.kode_barang.toLowerCase().includes(val.toLowerCase()) || 
                                                a.nama_barang.toLowerCase().includes(val.toLowerCase())
                                            ).slice(0, 5);
                                            setSuggestions(found);
                                        } else {
                                            setSuggestions([]); setAssetFound(null); setStatusMessage("");
                                        }
                                    }}
                                />
                                <Box className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <button type="button" onClick={() => setIsScanning(true)} className="px-3 bg-white border border-l-0 border-gray-200 rounded-r-xl hover:bg-gray-50 transition text-gray-600 shadow-sm">
                                    <QrCode size={18} />
                                </button>
                            </div>
                            {suggestions.length > 0 && (
                                <ul className="absolute z-[110] w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                    {suggestions.map((item) => (
                                        <li key={item.id_barang} className="p-3 hover:bg-rose-50 cursor-pointer text-xs border-b last:border-none flex flex-col transition-colors"
                                            onClick={() => selectAsset(item)}>
                                            <span className="font-bold text-gray-800">{item.nama_barang}</span>
                                            <span className="text-[10px] text-rose-600 font-black uppercase tracking-tighter">{item.kode_barang}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {statusMessage && <p className={`mt-1.5 text-[9px] font-black uppercase tracking-widest ${isAssetRemovable ? 'text-emerald-600' : 'text-rose-600'}`}>{statusMessage}</p>}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nilai Jual / Residu (Rp)</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px]">RP</div>
                                <input 
                                    type="text" className="w-full border p-2 pl-9 text-sm rounded-xl bg-gray-50/50 border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none shadow-sm transition-all"
                                    value={formatNumberInput(form.nilai_residu)} disabled={!isAssetRemovable}
                                    onChange={(e) => { const val = parseNumberInput(e.target.value); if(!isNaN(val)) setForm({...form, nilai_residu: val}); }}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* CURRENT INFO PANEL */}
                    <div className={`p-4 rounded-2xl border border-dashed transition-all ${assetFound ? 'bg-rose-50/30 border-rose-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Nama Aset</p><p className="text-xs font-bold text-gray-800 truncate">{assetFound?.nama_barang || '-'}</p></div>
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Kondisi</p><p className="text-xs font-bold text-gray-800 uppercase">{assetFound?.kondisi || '-'}</p></div>
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Nilai Perolehan</p><p className="text-xs font-black text-emerald-600">{assetFound ? formatCurrency(assetFound.nilai_nbv || assetFound.nilai_perolehan) : '-'}</p></div>
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Lokasi Terakhir</p><p className="text-xs font-bold text-gray-800 truncate">{assetFound?.lokasi?.nama_lokasi || '-'}</p></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Tanggal Penghapusan</label>
                            <input type="date" className="w-full border p-2 text-sm rounded-xl bg-gray-50/50 border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none shadow-sm" value={form.tanggal} onChange={e => setForm({...form, tanggal: e.target.value})} disabled={!isAssetRemovable} required/>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Alasan Penghapusan</label>
                            <input type="text" className="w-full border p-2 text-sm rounded-xl bg-gray-50/50 border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none shadow-sm" value={form.alasan} onChange={e => setForm({...form, alasan: e.target.value})} disabled={!isAssetRemovable} placeholder="Cth: Rusak total / Dijual lelang" required/>
                        </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-gray-100">
                        <button type="submit" disabled={!isAssetRemovable || isSaving} className="px-8 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-700 transition disabled:opacity-50 flex items-center gap-2">
                            {isSaving ? <Loader2 className="animate-spin" size={14}/> : <Trash2 size={14}/>} Eksekusi Penghapusan
                        </button>
                    </div>
                </form>
            </div>

            {/* RIWAYAT TABLE SECTION */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 tracking-tight uppercase"><History size={18} className="text-rose-600"/> Arsip Penghapusan</h3>
                <div className="relative flex w-full sm:w-72">
                    <input
                        type="text" placeholder="Filter arsip..."
                        className="pl-9 pr-4 py-1.5 w-full rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none shadow-sm transition-all"
                        value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
            </div>

            <div className="overflow-x-auto mb-4 -mx-4 sm:mx-0">
                <table className="w-full text-left border-separate border-spacing-y-2 min-w-[900px] px-4 sm:px-0">
                    <thead>
                        <tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em]">
                            <th className="px-4 py-2">Kode Aset</th>
                            <th className="px-4 py-2">Nama Barang</th>
                            <th className="px-4 py-2">Alasan Penghapusan</th>
                            <th className="px-4 py-2 text-right">Nilai Residu</th>
                            <th className="px-4 py-2 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {isLoading ? (
                            <tr>
                                <td colSpan="5" className="py-20 text-center bg-white rounded-2xl border shadow-sm">
                                    <Loader2 className="animate-spin h-6 w-6 text-rose-600 mx-auto mb-2" />
                                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Sinkronisasi Arsip...</span>
                                </td>
                            </tr>
                        ) : currentItems.length > 0 ? (
                            currentItems.map((item) => (
                                <tr key={item.id_penghapusan} className="bg-white shadow-sm hover:shadow-md hover:ring-1 hover:ring-rose-100 transition-all cursor-pointer group" onClick={() => { setSelectedDisposal(item); setShowDetailModal(true); }}>
                                    <td className="px-4 py-4 rounded-l-xl font-black text-rose-600 uppercase tracking-tighter">{item.barang.kode_barang}</td>
                                    <td className="px-4 py-4 font-bold text-gray-800">{item.barang.nama_barang}</td>
                                    <td className="px-4 py-4 text-gray-400 text-xs italic font-medium truncate max-w-[200px]">"{item.alasan}"</td>
                                    <td className="px-4 py-4 text-right font-black text-emerald-600">{formatCurrency(item.nilai_residu)}</td>
                                    <td className="px-4 py-4 rounded-r-xl text-right">
                                        <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border bg-rose-50 text-rose-600 border-rose-100 flex items-center gap-1 justify-end ml-auto w-fit">
                                            <AlertTriangle size={10}/> Dihapus
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5" className="px-4 py-16 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest bg-white rounded-2xl border">Arsip tidak ditemukan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4"> 
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Menampilkan {totalItems === 0 ? 0 : startIndex + 1}-{Math.min(totalItems, startIndex + itemsPerPage)} dari {totalItems} Arsip
                </div>
                <div className="flex items-center gap-3">
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-2 py-1 border border-gray-200 rounded text-[10px] font-black bg-white outline-none">
                        {ITEMS_PER_PAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} / page</option>)}
                    </select>
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                        <button onClick={() => paginate(currentPage-1)} disabled={currentPage === 1} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-r transition-colors"><ChevronLeft size={14}/></button>
                        <span className="px-3 py-1.5 text-[11px] font-black text-rose-600 bg-rose-50/50">{currentPage}</span>
                        <button onClick={() => paginate(currentPage+1)} disabled={currentPage === totalPages} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-l transition-colors"><ChevronRight size={14}/></button>
                    </div>
                </div>
            </div>

            {/* MODAL DETAIL (KONSISTEN) */}
            {showDetailModal && selectedDisposal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setShowDetailModal(false)}>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20" onClick={e => e.stopPropagation()}>
                        <div className="bg-gray-50 p-6 border-b flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-12 -mt-12"></div>
                            <div className="text-left relative z-10 text-black">
                                <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.2em] mb-2 inline-block leading-none">{selectedDisposal.barang.kode_barang}</span>
                                <h2 className="text-xl font-black text-gray-800 tracking-tight leading-none">{selectedDisposal.barang.nama_barang}</h2>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="bg-white p-2 rounded-full shadow-sm border border-gray-100 hover:text-rose-500 transition relative z-10"><X size={18}/></button>
                        </div>
                        <div className="p-8 space-y-2 text-left">
                            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><ClipboardList size={12}/> Log Penghapusan</h3>
                            <DetailItem label="Tanggal Eksekusi" value={new Date(selectedDisposal.tanggal).toLocaleDateString('id-ID', { dateStyle: 'long' })} />
                            <DetailItem label="Nilai Hasil (Residu)" value={formatCurrency(selectedDisposal.nilai_residu)} />
                            
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-6 shadow-inner">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Info size={12}/> Alasan Penghapusan</p>
                                <p className="text-gray-700 italic text-xs leading-relaxed font-medium">
                                    "{selectedDisposal.alasan || "Tidak ada catatan alasan tambahan."}"
                                </p>
                            </div>
                            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-center mt-4">
                                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Status Final</p>
                                <p className="text-rose-700 font-black text-sm uppercase">Aset Tidak Aktif / Terhapus</p>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t flex justify-end">
                            <button onClick={() => setShowDetailModal(false)} className="px-10 py-2.5 bg-gray-800 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition">Tutup Detail</button>
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
                            <h3 className="font-black text-lg text-gray-800 tracking-tight leading-none">Scan QR Penghapusan</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Identifikasi cepat aset yang akan dihapus</p>
                        </div>
                        <div id="disposal-reader" className="overflow-hidden rounded-2xl border-4 border-gray-100"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManajemenPenghapusanAsset;