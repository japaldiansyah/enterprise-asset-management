import React, { useState, useMemo, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../api/axiosConfig'; 

import { 
    Search, Send, Box, MapPin, User, Calendar, 
    X, QrCode, ChevronLeft, ChevronRight, Loader2, History, ArrowRight
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode'; 

const MUTASI_PATH = '/mutasi';
const BARANG_PATH = '/barang';
const LOKASI_PATH = '/lokasi';
const PJ_PATH = '/penanggungjawab';
const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

const initialFormState = {
    id_barang: '',
    lokasi_awal: '', 
    lokasi_tujuan: '',
    lokasi_tujuan_nama: '', // State tambahan untuk tampilan input
    penanggungjawab_baru: '',
    pj_baru_nama: '', // State tambahan untuk tampilan input
    tanggal_mutasi: new Date().toISOString().split('T')[0], 
};

// --- KOMPONEN AUTOCOMPLETE (Disesuaikan untuk Mutasi) ---
const AutocompleteInput = ({ label, placeholder, value, data, onSelect, fieldName, disabled }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => { setInputValue(value || ""); }, [value]);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputValue(val);
        if (val.length > 0) {
            const filtered = data.filter(item => 
                (item[fieldName] || "").toLowerCase().includes(val.toLowerCase())
            );
            setSuggestions(filtered);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    return (
        <div className="relative">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
            <input
                type="text"
                disabled={disabled}
                className="w-full border p-2 text-sm rounded-xl bg-gray-50/50 border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm disabled:opacity-50"
                placeholder={placeholder}
                value={inputValue}
                onChange={handleInputChange}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onFocus={() => { if(inputValue) setShowSuggestions(true); }}
            />
            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-[100] w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                    {suggestions.map((item, idx) => (
                        <li 
                            key={idx}
                            onClick={() => {
                                onSelect(item);
                                setInputValue(item[fieldName]);
                                setShowSuggestions(false);
                            }}
                            className="p-2.5 hover:bg-blue-600 hover:text-white cursor-pointer text-xs font-bold transition-colors border-b last:border-none"
                        >
                            {item[fieldName]}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const DetailItem = ({ label, value }) => (
    <div className="flex justify-between border-b border-gray-100 py-1.5 gap-4">
        <span className="text-gray-500 font-medium text-xs whitespace-nowrap">{label}:</span>
        <span className="font-bold text-xs text-gray-800 text-right">{value || '-'}</span>
    </div>
);

export default function RiwayatTransferAset() {
    const [mutations, setMutations] = useState([]);
    const [assets, setAssets] = useState([]);
    const [locations, setLocations] = useState([]);
    const [pjs, setPjs] = useState([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [form, setForm] = useState(initialFormState);
    const [assetPjId, setAssetPjId] = useState(null); 
    const [validationMessage, setValidationMessage] = useState({});

    const [assetCodeInput, setAssetCodeInput] = useState(''); 
    const [assetFound, setAssetFound] = useState(null); 
    const [suggestions, setSuggestions] = useState([]); 
    const [isAssetMutatable, setIsAssetMutatable] = useState(true);
    const [statusMessage, setStatusMessage] = useState('');
    
    const [isScanning, setIsScanning] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedMutation, setSelectedMutation] = useState(null); 
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const getLocationName = (id) => {
        const location = locations.find(loc => String(loc.id_lokasi) === String(id));
        return location ? location.nama_lokasi : `ID: ${id}`;
    };

    const getPjName = (id) => {
        const pj = pjs.find(p => String(p.id_penanggungjawab) === String(id));
        return pj ? pj.nama_pegawai : `ID: ${id}`;
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [mutRes, assetsRes, locsRes, pjsRes] = await Promise.all([
                api.get(MUTASI_PATH), api.get(BARANG_PATH), api.get(LOKASI_PATH), api.get(PJ_PATH)
            ]);
            setMutations(mutRes.data.data || []);
            setAssets(assetsRes.data.data || []);
            setLocations(locsRes.data.data || []);
            setPjs(pjsRes.data.data || []);
        } catch (error) {
            toast.error("Gagal memuat data mutasi.");
        } finally {
            setTimeout(() => setIsLoading(false), 500);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filteredMutations = useMemo(() => {
        return mutations.filter(mutasi => {
            const lowerCaseSearch = searchTerm.toLowerCase();
            const barang = mutasi.barang || {};
            return (
                barang.kode_barang?.toLowerCase().includes(lowerCaseSearch) ||
                barang.nama_barang?.toLowerCase().includes(lowerCaseSearch) ||
                getLocationName(mutasi.lokasi_tujuan).toLowerCase().includes(lowerCaseSearch)
            );
        }).sort((a, b) => new Date(b.tanggal_mutasi).getTime() - new Date(a.tanggal_mutasi).getTime());
    }, [mutations, searchTerm, locations]);

    const totalItems = filteredMutations.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredMutations.slice(startIndex, startIndex + itemsPerPage);

    const paginate = (n) => { if (n > 0 && n <= totalPages) setCurrentPage(n); };

    const selectAsset = (asset) => {
        setAssetFound(asset);
        setAssetCodeInput(asset.kode_barang);
        setAssetPjId(asset.id_penanggungjawab);
        setSuggestions([]);
        
        if (asset.status !== 'tersedia') {
            setIsAssetMutatable(false);
            setStatusMessage(`❌ Aset berstatus ${asset.status.toUpperCase()}.`);
        } else {
            setIsAssetMutatable(true);
            setStatusMessage(`✅ Aset siap dipindahkan.`);
            setForm(prev => ({ 
                ...prev, 
                id_barang: String(asset.id_barang), 
                lokasi_awal: String(asset.id_lokasi) 
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!assetFound || !isAssetMutatable) return toast.error("Aset tidak valid.");
        
        // Cek apakah lokasi atau PJ berubah
        const isChanged = (form.lokasi_tujuan && String(form.lokasi_tujuan) !== String(assetFound.id_lokasi)) ||
                          (form.penanggungjawab_baru && String(form.penanggungjawab_baru) !== String(assetFound.id_penanggungjawab));

        if (!isChanged) return toast.error("Harus ada perubahan Lokasi atau PJ Penerima.");

        const loadToast = toast.loading("Mencatat mutasi...");
        setIsSaving(true);
        try {
            await api.post(MUTASI_PATH, {
                id_barang: parseInt(form.id_barang),
                lokasi_awal: parseInt(form.lokasi_awal),
                lokasi_tujuan: parseInt(form.lokasi_tujuan),
                penanggungjawab_baru: parseInt(form.penanggungjawab_baru),
                tanggal_mutasi: form.tanggal_mutasi,
            });
            toast.success("Mutasi berhasil dicatat!", { id: loadToast });
            setForm(initialFormState); setAssetCodeInput(''); setAssetFound(null); setStatusMessage('');
            fetchData();
        } catch (error) {
            toast.error("Gagal mencatat mutasi.", { id: loadToast });
        } finally { setIsSaving(false); }
    };

    useEffect(() => {
        let scanner;
        if (isScanning) {
            scanner = new Html5QrcodeScanner("qr-transfer", { fps: 10, qrbox: 250 });
            scanner.render((text) => {
                const asset = assets.find(a => a.kode_barang?.toLowerCase() === text.toLowerCase());
                if (asset) selectAsset(asset);
                else { setAssetCodeInput(text); setStatusMessage("Kode tidak ditemukan"); }
                setIsScanning(false);
                scanner.clear();
            }, () => {});
        }
        return () => { if (scanner) scanner.clear().catch(() => {}); };
    }, [isScanning, assets]);

    return (
        <div className="p-4 lg:p-5 min-h-screen text-left">
            <Toaster position="top-right" />

            {/* HEADER */}
            <div className="mb-6">
                <h2 className="text-xl lg:text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 leading-none">
                    Transfer & Mutasi Aset
                    {isSaving && <Loader2 className="animate-spin text-blue-600" size={20} />}
                </h2>
                <p className="text-[12px] text-gray-400 font-medium mt-1">Pindahkan aset antar lokasi atau alihkan tanggung jawab ke pegawai lain.</p>
            </div>

            {/* FORM INPUT SECTION (AUTOCOMPLETE PJ & LOKASI) */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 mb-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16"></div>
                
                <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-gray-800 relative z-10">
                    <Send size={16} className="text-blue-600"/> Pencatatan Mutasi Baru
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="relative">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Identifikasi Aset</label>
                            <div className="relative flex">
                                <input
                                    type="text" value={assetCodeInput} placeholder="Ketik nama atau kode barang..."
                                    className="pl-9 pr-4 py-2 text-sm w-full rounded-l-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm bg-gray-50/50"
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setAssetCodeInput(val);
                                        const found = val ? assets.filter(a => a.kode_barang.toLowerCase().includes(val.toLowerCase()) || a.nama_barang.toLowerCase().includes(val.toLowerCase())).slice(0, 5) : [];
                                        setSuggestions(found);
                                        if(!val) { setAssetFound(null); setStatusMessage(""); }
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
                                        <li key={item.id_barang} className="p-3 hover:bg-blue-50 cursor-pointer text-xs border-b last:border-none flex flex-col transition-colors" onClick={() => selectAsset(item)}>
                                            <span className="font-bold text-gray-800">{item.nama_barang}</span>
                                            <span className="text-[10px] text-blue-600 font-black uppercase tracking-tighter">{item.kode_barang}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {statusMessage && <p className={`mt-1.5 text-[9px] font-black uppercase tracking-widest ${isAssetMutatable ? 'text-emerald-600' : 'text-rose-600'}`}>{statusMessage}</p>}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Tanggal Mutasi</label>
                            <input type="date" name="tanggal_mutasi" className="w-full border p-2 text-sm rounded-xl bg-gray-50/50 border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={form.tanggal_mutasi} onChange={(e) => setForm({...form, tanggal_mutasi: e.target.value})} required/>
                        </div>
                    </div>

                    {/* PANEL INFO ASET SAAT INI */}
                    <div className={`p-4 rounded-2xl border border-dashed transition-all ${assetFound ? 'bg-blue-50/30 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Aset Terpilih</p><p className="text-xs font-bold text-gray-800 truncate">{assetFound?.nama_barang || '-'}</p></div>
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Lokasi Saat Ini</p><p className="text-xs font-bold text-gray-800 truncate">{assetFound ? getLocationName(assetFound.id_lokasi) : '-'}</p></div>
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">PJ Saat Ini</p><p className="text-xs font-bold text-gray-800 truncate">{assetFound ? getPjName(assetFound.id_penanggungjawab) : '-'}</p></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* AUTOCOMPLETE LOKASI TUJUAN */}
                        <AutocompleteInput 
                            label="Lokasi Tujuan" 
                            placeholder="Ketik nama lokasi..." 
                            value={form.lokasi_tujuan_nama} 
                            data={locations} 
                            fieldName="nama_lokasi" 
                            disabled={!isAssetMutatable}
                            onSelect={(item) => {
                                if (String(item.id_lokasi) === String(form.lokasi_awal)) {
                                    toast.error("Lokasi tujuan tidak boleh sama dengan asal!");
                                } else {
                                    setForm({...form, lokasi_tujuan: String(item.id_lokasi), lokasi_tujuan_nama: item.nama_lokasi});
                                }
                            }}
                        />

                        {/* AUTOCOMPLETE PJ BARU */}
                        <AutocompleteInput 
                            label="PJ Penerima Baru" 
                            placeholder="Ketik nama pegawai..." 
                            value={form.pj_baru_nama} 
                            data={pjs} 
                            fieldName="nama_pegawai" 
                            disabled={!isAssetMutatable}
                            onSelect={(item) => {
                                if (String(item.id_penanggungjawab) === String(assetPjId)) {
                                    toast.error("Penanggung jawab baru tidak boleh sama dengan yang lama!");
                                } else {
                                    setForm({...form, penanggungjawab_baru: String(item.id_penanggungjawab), pj_baru_nama: item.nama_pegawai});
                                }
                            }}
                        />
                    </div>

                    <div className="flex justify-end pt-3 border-t border-gray-100">
                        <button type="submit" disabled={!isAssetMutatable || isSaving} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                            {isSaving ? <Loader2 className="animate-spin" size={14}/> : <Send size={14}/>} Eksekusi Mutasi
                        </button>
                    </div>
                </form>
            </div>

            {/* RIWAYAT TABEL AREA (STYLE KONSISTEN) */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 tracking-tight uppercase"><History size={18} className="text-blue-600"/> Riwayat Mutasi</h3>
                <div className="relative flex w-full sm:w-72">
                    <input
                        type="text" placeholder="Filter riwayat..."
                        className="pl-9 pr-4 py-1.5 w-full rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                        value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
            </div>

            <div className="overflow-x-auto mb-4 -mx-4 sm:mx-0">
                <table className="w-full text-left border-separate border-spacing-y-2 min-w-[850px] px-4 sm:px-0">
                    <thead>
                        <tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em]">
                            <th className="px-4 py-2">Aset & Kode</th>
                            <th className="px-4 py-2 text-center">Mutasi Lokasi</th>
                            <th className="px-4 py-2">PJ Penerima</th>
                            <th className="px-4 py-2 text-right">Tanggal</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {isLoading ? (
                            <tr>
                                <td colSpan="4" className="py-20 text-center bg-white rounded-2xl border shadow-sm">
                                    <Loader2 className="animate-spin h-6 w-6 text-blue-600 mx-auto mb-2" />
                                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Memuat Riwayat...</span>
                                </td>
                            </tr>
                        ) : currentItems.length > 0 ? (
                            currentItems.map((mutasi) => (
                                <tr key={mutasi.id_mutasi} className="bg-white shadow-sm hover:shadow-md hover:ring-1 hover:ring-blue-100 transition-all cursor-pointer group" onClick={() => { setSelectedMutation(mutasi); setShowDetailModal(true); }}>
                                    <td className="px-4 py-3 rounded-l-xl">
                                        <div className="font-bold text-gray-800 truncate max-w-[200px]">{mutasi.barang?.nama_barang || 'N/A'}</div>
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{mutasi.barang?.kode_barang || 'N/A'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-gray-100 text-gray-500">{getLocationName(mutasi.lokasi_awal)}</span>
                                            <ArrowRight size={12} className="text-gray-300" />
                                            <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-emerald-50 text-emerald-600">{getLocationName(mutasi.lokasi_tujuan)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <User size={12} className="text-gray-400" />
                                            <span className="font-bold text-gray-700">{getPjName(mutasi.penanggungjawab_baru)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 rounded-r-xl text-right font-black text-gray-400 text-[10px]">
                                        {new Date(mutasi.tanggal_mutasi).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="px-4 py-16 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest bg-white rounded-2xl border">Belum ada riwayat mutasi.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION UTAMA */}
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
                        <span className="px-3 py-1.5 text-[11px] font-black text-blue-600 bg-blue-50/50">{currentPage}</span>
                        <button onClick={() => paginate(currentPage+1)} disabled={currentPage === totalPages} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-l transition-colors"><ChevronRight size={14}/></button>
                    </div>
                </div>
            </div>

            {/* MODAL DETAIL RIWAYAT */}
            {showDetailModal && selectedMutation && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20">
                        <div className="bg-gray-50 p-6 border-b flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12"></div>
                            <div className="text-left relative z-10">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.2em] mb-2 inline-block leading-none">{selectedMutation.barang?.kode_barang}</span>
                                <h2 className="text-xl font-black text-gray-800 tracking-tight leading-none">{selectedMutation.barang?.nama_barang}</h2>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="bg-white p-2 rounded-full shadow-sm border border-gray-100 hover:text-red-500 transition relative z-10"><X size={18}/></button>
                        </div>
                        <div className="p-8 space-y-2 text-left">
                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><History size={12}/> Detail Log Mutasi</h3>
                            <DetailItem label="Lokasi Asal" value={getLocationName(selectedMutation.lokasi_awal)} />
                            <DetailItem label="Lokasi Tujuan" value={getLocationName(selectedMutation.lokasi_tujuan)} />
                            <DetailItem label="Penanggung Jawab Baru" value={getPjName(selectedMutation.penanggungjawab_baru)} />
                            <DetailItem label="Waktu Mutasi" value={new Date(selectedMutation.tanggal_mutasi).toLocaleDateString('id-ID', { dateStyle: 'long' })} />
                            
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center mt-6 shadow-inner">
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Status Verifikasi</p>
                                <p className="text-emerald-700 font-black text-sm uppercase">Berhasil Dipindahkan</p>
                            </div>
                        </div>
                        <div className="p-5 bg-gray-50 border-t flex justify-end">
                            <button onClick={() => setShowDetailModal(false)} className="px-8 py-2.5 bg-gray-800 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition">Tutup Detail</button>
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
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Identifikasi otomatis aset transfer</p>
                        </div>
                        <div id="qr-transfer" className="overflow-hidden rounded-2xl border-4 border-gray-100"></div>
                    </div>
                </div>
            )}
        </div>
    );
}