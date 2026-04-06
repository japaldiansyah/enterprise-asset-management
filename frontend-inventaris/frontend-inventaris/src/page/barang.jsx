import { useEffect, useState, useMemo } from "react";
// --- TAMBAHAN: Import useSearchParams ---
import { useSearchParams } from "react-router-dom"; 
import toast, { Toaster } from 'react-hot-toast';
import api from '../api/axiosConfig'; 
import { 
    ChevronLeft, ChevronRight, X, QrCode, Sliders, Layers, 
    MapPinned, UserCheck, DollarSign, History, Loader2, Search, Plus, Wrench, Info, Trash2, AlertTriangle, PieChart, TrendingDown, Target, TrendingUp,
    ArrowRight, Download
} from "lucide-react"; 
import { Html5QrcodeScanner } from "html5-qrcode";
import RevaluationModal from '../components/RevaluationModel';

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

// --- FUNGSI HELPER TETAP SAMA ---
const formatNumberInput = (num) => {
    if (!num) return "";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseNumberInput = (str) => {
    return str.replace(/\./g, "");
};





// --- KOMPONEN PEMBANTU TETAP SAMA ---
const AutocompleteInput = ({ label, placeholder, value, data, onSelect, fieldName }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    useEffect(() => { setInputValue(value || ""); }, [value]);
    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputValue(val);
        if (val.length > 0) {
            const filtered = data.filter(item => (item[fieldName] || "").toLowerCase().includes(val.toLowerCase()));
            setSuggestions(filtered); setShowSuggestions(true);
        } else { setShowSuggestions(false); }
    };
    return (
        <div className="relative">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</label>
            <input type="text" className="w-full border p-2 text-sm rounded-lg bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder={placeholder} value={inputValue} onChange={handleInputChange} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onFocus={() => { if(inputValue) setShowSuggestions(true); }} />
            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                    {suggestions.map((item, idx) => (
                        <li key={idx} onClick={() => { onSelect(item); setInputValue(item[fieldName]); setShowSuggestions(false); }} className="p-2 hover:bg-blue-600 hover:text-white cursor-pointer text-xs transition-colors border-b last:border-none">{item[fieldName]}</li>
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

export default function Barang() {
  // --- 1. LOGIKA URL (SEARCH PARAMS) ---
  const [searchParams, setSearchParams] = useSearchParams();

  const [showRevalModal, setShowRevalModal] = useState(false);

  const [showAllHistory, setShowAllHistory] = useState(false);

  const [activeTab, setActiveTab] = useState('info'); // 'info' atau 'riwayat'
  const [logs, setLogs] = useState([]);

  const [errors, setErrors] = useState({});

  const [barang, setBarang] = useState([]);
  const [kategori, setKategori] = useState([]);
  const [lokasi, setLokasi] = useState([]);
  const [penanggungjawab, setPenanggungJawab] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBarang, setSelectedBarang] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false); 
  const [isScanning, setIsScanning] = useState(false);

  // --- 2. SINKRONISASI STATE DENGAN URL ---
  const searchTerm = searchParams.get("q") || "";
  const filterLokasi = searchParams.get("lokasi") || "";
  const filterKategori = searchParams.get("kategori") || "";
  const filterPenanggungJawab = searchParams.get("pj") || "";
  const filterStatus = searchParams.get("status") || "";
  const filterKondisi = searchParams.get("kondisi") || "";
  const currentPage = parseInt(searchParams.get("page") || "1");
  const itemsPerPage = parseInt(searchParams.get("limit") || "10");

  const [form, setForm] = useState({
    kode_barang: "", nama_barang: "", id_kategori: "", kategori_nama: "",
    merk: "", tanggal_perolehan: "", nilai_perolehan: "", kondisi: "baik",
    status: "tersedia", id_lokasi: "", lokasi_nama: "", id_penanggungjawab: "", pj_nama: ""
  });

  const validateForm = () => {
    let newErrors = {};
    if (!form.kode_barang) newErrors.kode_barang = "Kode barang wajib diisi";
    if (!form.nama_barang) newErrors.nama_barang = "Nama barang wajib diisi";
    if (!form.id_kategori) newErrors.id_kategori = "Pilih kategori dari daftar";
    if (!form.id_lokasi) newErrors.id_lokasi = "Pilih lokasi dari daftar";
    if (!form.id_penanggungjawab) newErrors.id_penanggungjawab = "Pilih penanggung jawab";
    if (!form.nilai_perolehan) newErrors.nilai_perolehan = "Nilai perolehan wajib diisi";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true jika tidak ada error
  };

  // Efek untuk mengambil log saat tab riwayat dibuka
  useEffect(() => {
      if (activeTab === 'riwayat' && selectedBarang) {
          api.get(`/barang/${selectedBarang.id_barang}/logs`)
              .then(res => setLogs(res.data.data))
              .catch(err => console.error("Gagal load riwayat", err));
      }
  }, [activeTab, selectedBarang]);

  // --- 3. FUNGSI UPDATE URL (PENGGANTI SETTER BIASA) ---
  const updateParams = (updates) => {
    const params = new URLSearchParams(searchParams);
  
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const isOpeningDetail = Object.keys(updates).includes('id');
    const isChangingPage = Object.keys(updates).includes('page');

    if (!isOpeningDetail && !isChangingPage) {
      params.set("page", "1");
    }
    // -------------------------

    setSearchParams(params, { replace: true });
  };

  const fetchBarang = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/barang");
      setBarang(res.data.data);
    } catch (err) { 
        toast.error("Gagal mengambil data barang");
    } finally { setTimeout(() => setIsLoading(false), 500); }
  };
  
  const fetchDataPendukung = async () => {
    try {
        const [resKat, resLok, resPj] = await Promise.all([
            api.get("/kategori"), api.get("/lokasi"), api.get("/penanggungjawab")
        ]);
        setKategori(resKat.data.data);
        setLokasi(resLok.data.data);
        setPenanggungJawab(resPj.data.data);
    } catch (err) { console.error(err); }
  };
  
  useEffect(() => { fetchBarang(); fetchDataPendukung(); }, []);

  // Sync Modal Detail jika user refresh halaman dengan ID tertentu (Opsional)
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam && !selectedBarang) {
        handleDetailClick(idParam);
    }
  }, [searchParams]);

  const handleDetailClick = async (id) => {
    setIsDetailLoading(true);
    updateParams({ id: id }); // Simpan ID ke URL
    try {
        const res = await api.get(`/barang/${id}`);
        setSelectedBarang(res.data.data);
        setShowDetailModal(true);
    } catch (err) {
        toast.error("Gagal memuat detail data.");
        updateParams({ id: null });
    } finally {
        setIsDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    updateParams({ id: null }); // Hapus ID dari URL saat tutup
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrors({}); // Reset error setiap kali submit

    // 1. Validasi Frontend
    if (!validateForm()) {
        toast.error("Mohon lengkapi data yang bertanda merah");
        return;
    }

    const loadingToast = toast.loading("Sedang menyimpan data...");
    try {
        await api.post("/barang", form);
        toast.success("Berhasil!", { id: loadingToast });
        setShowForm(false);
        // ... reset form
    } catch (err) {
        if (err.response && err.response.status === 422) {
            // 2. Tangkap error dari Laravel (misal: kode_barang sudah ada)
            setErrors(err.response.data.errors);
            toast.error("Beberapa data tidak valid", { id: loadingToast });
        } else {
            toast.error("Gagal menyimpan data", { id: loadingToast });
        }
    }
  };

  const handleCancelForm = () => {
    // 1. Reset state form ke kondisi awal
    setForm({
        kode_barang: "", nama_barang: "", id_kategori: "", kategori_nama: "",
        merk: "", tanggal_perolehan: "", nilai_perolehan: "", kondisi: "baik",
        status: "tersedia", id_lokasi: "", lokasi_nama: "", id_penanggungjawab: "", pj_nama: ""
    });

    // 2. Bersihkan semua indikator error (field merah & pesan teks)
    setErrors({});

    // 3. Tutup modal
    setShowForm(false);
  };

  // --- STATE BARU UNTUK LAPORAN KERUSAKAN ---
  const [showLaporanModal, setShowLaporanModal] = useState(false);
  const [laporanData, setLaporanData] = useState({
      id_barang: '',
      id_penanggungjawab: '', // Ini akan diisi oleh Autocomplete
      pj_nama: '',       // Untuk display di input
      deskripsi: '',
      tingkat: 'rusak ringan'
  });

  // Fungsi untuk membuka modal dan otomatis set ID barang
  const handleOpenLaporan = (barang) => {
      setLaporanData({ ...laporanData, id_barang: barang.id_barang });
      setShowLaporanModal(true);
  };

  // Fungsi Kirim ke API Laravel 
  const submitLaporan = async (e) => {
    if (e) e.preventDefault();

    // 1. Validasi
    if (!laporanData.id_penanggungjawab) {
      toast.error("Pilih pelapor terlebih dahulu!");
      return;
    }

    const loadingToast = toast.loading("Sedang menyimpan laporan...");

    try {
      // 2. Kirim ke API
      await api.post('/laporan-kerusakan', laporanData);
      
      toast.success("Laporan berhasil dikirim!", { id: loadingToast });
      
      // 3. Reset State Form Laporan
      setLaporanData({ 
          id_barang: '', 
          id_penanggungjawab: '', 
          pj_nama: '', // Ini akan otomatis mengosongkan AutocompleteInput
          deskripsi: '', 
          tingkat: 'rusak ringan' 
      });

      // 4. Tutup Modal & Refresh
      setShowLaporanModal(false);
      fetchBarang(); 
      closeDetailModal(); 

    } catch (error) {
      console.error(error);
      toast.error("Gagal mengirim laporan!", { id: loadingToast });
    }
  };

  const handleCancelLaporan = () => {
    setLaporanData({ 
        id_barang: '', 
        id_penanggungjawab: '', 
        pj_nama: '', 
        deskripsi: '', 
        tingkat: 'rusak ringan' 
    });
    setShowLaporanModal(false);
  };


  const handleClearFilters = () => {
    setSearchParams({}); // Mengosongkan semua parameter di URL
    toast.success("Filter dibersihkan");
  };

  const filteredBarang = useMemo(() => {
    return barang.filter(item => {
      const matchesSearch = !searchTerm || item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) || item.kode_barang.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLokasi = !filterLokasi || String(item.id_lokasi) === filterLokasi;
      const matchesKategori = !filterKategori || String(item.id_kategori) === filterKategori;
      const matchesPj = !filterPenanggungJawab || String(item.id_penanggungjawab) === filterPenanggungJawab;
      const matchesStatus = !filterStatus || item.status === filterStatus;
      const matchesKondisi = !filterKondisi || item.kondisi === filterKondisi;
      return matchesSearch && matchesLokasi && matchesKategori && matchesPj && matchesStatus && matchesKondisi;
    });
  }, [barang, searchTerm, filterLokasi, filterKategori, filterPenanggungJawab, filterStatus, filterKondisi]); 

  const handleDownloadQr = async (id, kode) => {
    try {
        const response = await api.get(`/barang/${id}/download-qr`, {
            responseType: 'blob', // ← penting untuk download file
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Label_QR_${kode}.png`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        alert("Gagal mendownload label QR");
        console.error(error);
    }
  };

  const totalItems = filteredBarang.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredBarang.slice(startIndex, startIndex + itemsPerPage);

  const paginate = (n) => { if (n > 0 && n <= totalPages) updateParams({ page: n }); };

  useEffect(() => {
    let scanner;
    if (isScanning) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
      scanner.render((text) => {
          updateParams({ q: text }); // Update URL q
          setIsScanning(false);
          scanner.clear();
          toast.success("QR Berhasil di-scan");
      }, () => {});
    }
    return () => { if (scanner) scanner.clear().catch(() => {}); };
  }, [isScanning]);

  return (
    <div className="p-4 lg:p-5 min-h-screen text-left"> 
      <Toaster position="top-right" />

      {/* HEADER TETAP SAMA */}
      <div className="mb-6">
        <h2 className="text-xl lg:text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 leading-none">
            Manajemen Barang
            {isDetailLoading && <Loader2 className="animate-spin text-blue-600" size={20} />}
        </h2>
        <p className="text-[12px] text-gray-400 font-medium mt-1">Kelola dan pantau seluruh aset inventaris secara real-time.</p>
      </div>
      
      {/* TOOLBAR: Input Search menggunakan updateParams */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex flex-1 md:w-72"> 
                <input
                    type="text"
                    placeholder="Cari nama atau kode..."
                    className="pl-9 pr-12 py-1.5 text-sm w-full rounded-l-lg border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => updateParams({ q: e.target.value })}
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <button onClick={() => setIsScanning(true)} className="px-3 bg-gray-50 border border-l-0 border-gray-200 rounded-r-lg hover:bg-gray-100 transition text-gray-600">
                    <QrCode size={18} />
                </button>
            </div>
            <button onClick={() => setShowFilterModal(true)} className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg shadow-sm flex items-center gap-2 hover:bg-gray-50 text-[10px] font-black uppercase tracking-widest">
                <Sliders size={16} /> Filter
            </button>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-100 hover:bg-blue-700 transition flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <Plus size={16} /> Tambah Barang
        </button>
      </div>
      
      {/* TABLE & PAGINATION MENGGUNAKAN LOGIKA BARU */}
      <div className="overflow-x-auto mb-4 -mx-4 sm:mx-0">
        <table className="w-full text-left border-separate border-spacing-y-2 min-w-[850px] px-4 sm:px-0">
          <thead>
            <tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em]">
              <th className="px-4 py-2">Kode</th>
              <th className="px-4 py-2">Nama Barang</th>
              <th className="px-4 py-2">Kategori</th>
              <th className="px-4 py-2">Lokasi</th>
              <th className="px-4 py-2">PJ</th>
              <th className="px-4 py-2 text-right">Nilai Perolehan</th>
              <th className="px-4 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {isLoading ? (
              <tr>
                <td colSpan="7" className="py-20 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <Loader2 className="animate-spin h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Sinkronisasi Data...</span>
                </td>
              </tr>
            ) : currentItems.length > 0 ? (
              currentItems.map((item) => ( 
                <tr key={item.id_barang} className="bg-white shadow-sm hover:shadow-md hover:ring-1 hover:ring-blue-100 transition-all cursor-pointer group" onClick={() => handleDetailClick(item.id_barang)}>
                  <td className="px-4 py-3 rounded-l-xl font-bold text-blue-600">{item.kode_barang}</td>
                  <td className="px-4 py-3 text-gray-800 font-bold">{item.nama_barang}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.kategori?.nama_kategori || 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.lokasi?.nama_lokasi || 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.penanggungjawab?.nama_pegawai || 'N/A'}</td>
                  <td className="px-4 py-3 font-bold text-gray-700 text-right">Rp {Number(item.nilai_perolehan).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3 rounded-r-xl text-right">
                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border ${item.status === "tersedia" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : item.status === "dihapus" ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>{item.status}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" className="px-4 py-16 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest bg-white rounded-2xl border">Data tidak ditemukan.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4"> 
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {totalItems === 0 ? 'Tidak ada aset' : `Menampilkan ${startIndex + 1}-${Math.min(totalItems, startIndex + itemsPerPage)} dari ${totalItems} aset`}
          </div>
          <div className="flex items-center gap-3">
              <select value={itemsPerPage} onChange={(e) => updateParams({ limit: e.target.value, page: 1 })} className="px-2 py-1 border border-gray-200 rounded text-[10px] font-black bg-white text-gray-600 outline-none">
                  {ITEMS_PER_PAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} / page</option>)}
              </select>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white">
                  <button onClick={() => paginate(currentPage-1)} disabled={currentPage === 1} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-r transition-colors"><ChevronLeft size={14}/></button>
                  <span className="px-3 py-1.5 text-[11px] font-black text-blue-600 bg-blue-50/50">{currentPage}</span>
                  <button onClick={() => paginate(currentPage+1)} disabled={currentPage >= totalPages} className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-l transition-colors"><ChevronRight size={14}/></button>
              </div>
          </div>
      </div>

      {/* FORM MODAL TETAP SAMA */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-lg font-black text-gray-800 tracking-tight">Tambah Aset Baru</h2>
                <button onClick={handleCancelForm} className="text-gray-400 hover:text-red-500 transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto no-scrollbar">
                {/* BARIS 1: KODE & NAMA */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-left">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Kode Barang</label>
                        <input 
                            type="text" 
                            className={`w-full border p-2 text-sm rounded-lg bg-gray-50 outline-none transition-all ${errors.kode_barang ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'}`} 
                            value={form.kode_barang} 
                            onChange={e => { setForm({...form, kode_barang: e.target.value}); setErrors({...errors, kode_barang: null}); }} 
                            placeholder="ID-XXXX" 
                        />
                        {errors.kode_barang && <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tighter">{errors.kode_barang}</p>}
                    </div>

                    <div className="text-left">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Barang</label>
                        <input 
                            type="text" 
                            className={`w-full border p-2 text-sm rounded-lg bg-gray-50 outline-none transition-all ${errors.nama_barang ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'}`} 
                            value={form.nama_barang} 
                            onChange={e => { setForm({...form, nama_barang: e.target.value}); setErrors({...errors, nama_barang: null}); }} 
                            placeholder="Nama Aset" 
                        />
                        {errors.nama_barang && <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tighter">{errors.nama_barang}</p>}
                    </div>
                </div>

                {/* AUTOCOMPLETE INPUTS */}
                <div className="space-y-4">
                    <div className="text-left">
                        <AutocompleteInput 
                            label="Kategori" 
                            placeholder="Cari kategori..." 
                            value={form.kategori_nama} 
                            data={kategori} 
                            fieldName="nama_kategori" 
                            onSelect={(item) => {
                                setForm({...form, id_kategori: item.id_kategori, kategori_nama: item.nama_kategori});
                                setErrors({...errors, id_kategori: null});
                            }} 
                        />
                        {errors.id_kategori && <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tighter">{errors.id_kategori}</p>}
                    </div>

                    <div className="text-left">
                        <AutocompleteInput 
                            label="Lokasi" 
                            placeholder="Cari lokasi..." 
                            value={form.lokasi_nama} 
                            data={lokasi} 
                            fieldName="nama_lokasi" 
                            onSelect={(item) => {
                                setForm({...form, id_lokasi: item.id_lokasi, lokasi_nama: item.nama_lokasi});
                                setErrors({...errors, id_lokasi: null});
                            }} 
                        />
                        {errors.id_lokasi && <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tighter">{errors.id_lokasi}</p>}
                    </div>

                    <div className="text-left">
                        <AutocompleteInput 
                            label="Penanggung Jawab" 
                            placeholder="Cari PJ..." 
                            value={form.pj_nama} 
                            data={penanggungjawab} 
                            fieldName="nama_pegawai" 
                            onSelect={(item) => {
                                setForm({...form, id_penanggungjawab: item.id_penanggungjawab, pj_nama: item.nama_pegawai});
                                setErrors({...errors, id_penanggungjawab: null});
                            }} 
                        />
                        {errors.id_penanggungjawab && <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tighter">{errors.id_penanggungjawab}</p>}
                    </div>
                </div>

                {/* MERK & KONDISI */}
                <div className="grid grid-cols-2 gap-4 text-left">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Merk</label>
                        <input 
                            type="text" 
                            className={`w-full border p-2 text-sm rounded-lg bg-gray-50 outline-none transition-all ${errors.merk ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'}`} 
                            value={form.merk} 
                            onChange={e => { setForm({...form, merk: e.target.value}); setErrors({...errors, merk: null}); }} 
                            placeholder="Dell, ASUS, etc"
                        />
                        {errors.merk && <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tighter">{errors.merk}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Kondisi</label>
                        <select 
                            className="w-full border p-2 text-sm rounded-lg bg-gray-50 border-gray-200 outline-none" 
                            value={form.kondisi} 
                            onChange={e => setForm({...form, kondisi: e.target.value})}
                        >
                            <option value="baik">Baik</option>
                            <option value="rusak ringan">Rusak Ringan</option>
                            <option value="rusak berat">Rusak Berat</option>
                        </select>
                    </div>
                </div>

                {/* TANGGAL & NILAI */}
                <div className="grid grid-cols-2 gap-4 text-left">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tanggal Perolehan</label>
                        <input 
                            type="date" 
                            className={`w-full border p-2 text-sm rounded-lg bg-gray-50 outline-none transition-all ${errors.tanggal_perolehan ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-200'}`} 
                            value={form.tanggal_perolehan} 
                            onChange={e => { setForm({...form, tanggal_perolehan: e.target.value}); setErrors({...errors, tanggal_perolehan: null}); }} 
                        />
                        {errors.tanggal_perolehan && <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tighter">{errors.tanggal_perolehan}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nilai Perolehan</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px]">RP</div>
                            <input 
                                type="text" 
                                className={`w-full border p-2 pl-9 text-sm rounded-lg bg-gray-50 outline-none transition-all ${errors.nilai_perolehan ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'}`} 
                                value={formatNumberInput(form.nilai_perolehan)} 
                                onChange={(e) => { 
                                    const raw = parseNumberInput(e.target.value); 
                                    if (!isNaN(raw)) {
                                        setForm({...form, nilai_perolehan: raw}); 
                                        setErrors({...errors, nilai_perolehan: null});
                                    }
                                }} 
                                placeholder="0" 
                            />
                        </div>
                        {errors.nilai_perolehan && <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tighter">{errors.nilai_perolehan}</p>}
                    </div>
                </div>
            </form>

            <div className="p-5 bg-gray-50 border-t flex justify-end gap-2">
                <button type="button" onClick={handleCancelForm} className="px-5 py-2 text-[10px] font-black uppercase text-gray-500 hover:text-gray-700 transition">Batal</button>
                <button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition">Simpan Aset</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL - Sync dengan updateParams */}
      {showDetailModal && selectedBarang && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-end z-[110] transition-opacity"
          onClick={closeDetailModal}
        >
          <div 
            className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* 1. Header Panel */}
            <div className="bg-white p-6 border-b flex justify-between items-center shrink-0">
              <div className="text-left">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.2em] mb-2 inline-block">
                  {selectedBarang.kode_barang}
                </span>
                <h2 className="text-xl font-black text-gray-800 tracking-tight leading-tight">
                  Detail Aset
                </h2>
              </div>
              <button 
                onClick={closeDetailModal} 
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition"
              >
                <X size={20}/>
              </button>
            </div>

            {/* 2. TAB NAVIGATOR - Menambah dimensi baru pada Sidepanel */}
            <div className="flex px-6 border-b shrink-0 bg-white">
              <button 
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Informasi Aset
              </button>
              <button 
                onClick={() => setActiveTab('riwayat')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === 'riwayat' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Riwayat Aktivitas
              </button>
              <button 
                onClick={() => setActiveTab('financial')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === 'financial' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Financial
              </button>
            </div>

            {/* 3. Body Panel - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 text-left no-scrollbar">
              
              {activeTab === 'info' && (
                /* --- KONTEN TAB INFORMASI (Kode Asli Anda) --- */
                <div className="animate-in fade-in duration-300">
                  {/* QR Code Section */}
                  <div className="group relative mb-8 flex flex-col items-center bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                    
                    {/* Badge Label Modern */}
                    <div className="absolute top-4 left-4">
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <QrCode size={12} /> Asset Label
                      </span>
                    </div>

                    {/* Tombol Download Modern (Floating Action) */}
                    <button 
                      onClick={() => handleDownloadQr(selectedBarang.id_barang, selectedBarang.kode_barang)}
                      className="absolute top-4 right-4 p-2.5 bg-gray-900 text-white rounded-xl shadow-lg hover:bg-blue-600 hover:scale-110 transition-all duration-200 group/btn"
                      title="Download Label QR"
                    >
                      <Download size={18} className="group-hover/btn:animate-bounce" />
                    </button>

                    {/* Container Image dengan Efek Glassmorphism */}
                    <div className="relative mt-6 p-4 bg-gradient-to-tr from-gray-50 to-white rounded-2xl border border-gray-100 group-hover:rotate-1 transition-transform duration-500">
                      {selectedBarang.qr_code_path ? (
                        <img 
                          src={`https://inventaris-be.tunggalika.com/storage/${selectedBarang.qr_code_path}`} 
                          className="w-40 h-40 object-contain mix-blend-multiply" 
                          alt="QR" 
                        />
                      ) : (
                        <div className="w-40 h-40 flex flex-col items-center justify-center text-gray-300 italic">
                          <QrCode size={48} className="opacity-10 mb-2" />
                          <span className="text-[10px]">QR Not Generated</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Kode Barang</p>
                      <h3 className="text-lg font-black text-gray-800 tracking-tight">{selectedBarang.kode_barang}</h3>
                      <p className="text-sm text-gray-500 font-medium">{selectedBarang.nama_barang}</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <Info size={14}/> Informasi Dasar
                      </h3>
                      <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-1 shadow-sm">
                          <DetailItem label="Merk" value={selectedBarang.merk} />
                          <DetailItem label="Kategori" value={selectedBarang.kategori?.nama_kategori} />
                          <div className="flex justify-between border-b border-gray-100 py-1.5 gap-4">
                            <span className="text-gray-500 font-medium text-xs whitespace-nowrap">Kondisi:</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                              selectedBarang.kondisi === "baik" 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                : selectedBarang.kondisi === "rusak ringan"
                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                : "bg-rose-50 text-rose-600 border-rose-100"
                            }`}>
                              {selectedBarang.kondisi || 'Tidak Diketahui'}
                            </span>
                          </div>
                          <DetailItem label="Lokasi" value={selectedBarang.lokasi?.nama_lokasi} />
                          <DetailItem label="Penanggung Jawab" value={selectedBarang.penanggungjawab?.nama_pegawai} />
                          <DetailItem label="Tgl Perolehan" value={selectedBarang.tanggal_perolehan ? new Date(selectedBarang.tanggal_perolehan).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : '-'} />
                          {/* Menggunakan data umur_fisik_hari dari Controller */}
                            <DetailItem 
                              label="Umur Aset (Total)" 
                              value={`${selectedBarang.umur_fisik_hari || 0} Hari`} 
                            />
                      </div>
                    </section>


                    {selectedBarang.status === 'dihapus' && (
                      <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <Trash2 size={14}/> Riwayat Pelepasan
                          </h3>
                          <div className="bg-rose-50/30 border border-rose-100 rounded-2xl p-4 space-y-2">
                              <DetailItem label="Tanggal Lepas" value={selectedBarang.penghapusan?.tanggal ? new Date(selectedBarang.penghapusan.tanggal).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : '-'} />
                              <DetailItem label="Nilai Jual" value={`Rp ${Number(selectedBarang.penghapusan?.nilai_sisa || 0).toLocaleString("id-ID")}`} />
                              <div className="pt-2">
                                <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider">Alasan:</span>
                                <p className="text-gray-700 text-xs mt-1 italic bg-white p-3 rounded-xl border border-rose-50 leading-relaxed">
                                  {selectedBarang.penghapusan?.alasan || 'Tidak ada catatan alasan.'}
                                </p>
                              </div>
                          </div>
                      </section>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'riwayat' && (
                /* --- KONTEN TAB RIWAYAT (Timeline) --- */
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <History size={14}/> Timeline Aktivitas
                  </h3>
                  
                  <div className="relative border-l-2 border-gray-100 ml-2 space-y-8 pb-10">
                    {logs.length > 0 ? logs.map((log, idx) => (
                      <div key={idx} className="relative pl-6">
                        {/* Dot Indikator */}
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 shadow-sm ${
                          log.aksi.toLowerCase().includes('registrasi') ? 'border-blue-500' :
                          log.aksi.toLowerCase().includes('kerusakan') ? 'border-rose-500' :
                          log.aksi.toLowerCase().includes('peminjaman') ? 'border-amber-500' :
                          'border-emerald-500'
                        }`} />
                        
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight leading-none">
                              {log.aksi}
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold bg-white px-2 py-0.5 rounded-full border border-gray-100">
                              {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600 leading-relaxed italic">
                            "{log.deskripsi}"
                          </p>
                          <div className="mt-2 text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                              Recorded at {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                        <History size={32} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Belum ada riwayat</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* --- KONTEN TAB 3: FINANCIAL REPORT (REVISI NILAI SISA 0) --- */}
              {activeTab === 'financial' && (
                <div className="animate-in slide-in-from-right-4 duration-300 space-y-6">
                  
                  {/* 1. Summary Card (Nilai Buku) */}
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Net Book Value (NBV)</p>
                        <h2 className="text-3xl font-black tracking-tight">
                          Rp {Number(selectedBarang.nilai_nbv || 0).toLocaleString("id-ID")}
                        </h2>
                      </div>
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <PieChart size={24} className="text-white"/>
                      </div>
                    </div>
                    {/* Visual Bar Penyusutan (Tampilan Semula - Logika Baru) */}
                    <div className="mt-6">
                      <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider mb-2 opacity-90">
                        <span>
                          {selectedBarang.is_revaluated ? "Penyusutan (Pasca Revaluasi)" : "Penyusutan (Terpakai)"}
                        </span>
                        <span>Sisa Manfaat</span>
                      </div>

                      <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden flex">
                        <div 
                          className={`h-full ${selectedBarang.is_revaluated ? 'bg-indigo-400' : 'bg-white/40'}`} 
                          style={{ 
                            width: `${Math.min(
                              ((Number(selectedBarang.akumulasi_depresiasi_current || selectedBarang.akumulasi_depresiasi || 0)) / 
                              (Number(selectedBarang.nilai_dasar_perhitungan || selectedBarang.nilai_perolehan || 1))) * 100, 
                              100
                            )}%` 
                          }}
                        ></div>
                        <div className="h-full bg-white flex-1"></div>
                      </div>

                      <div className="flex justify-between text-[9px] font-bold mt-2">
                        <div className="flex flex-col">
                          <span>
                            Rp {Number(selectedBarang.akumulasi_depresiasi_current || selectedBarang.akumulasi_depresiasi || 0).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <span>
                          {/* Hitung Persen Sisa Secara Dinamis */}
                          {Math.max(100 - (
                            ((Number(selectedBarang.akumulasi_depresiasi_current || selectedBarang.akumulasi_depresiasi || 0)) / 
                            (Number(selectedBarang.nilai_dasar_perhitungan || selectedBarang.nilai_perolehan || 1))) * 100
                          ), 0).toFixed(1)}% Lagi
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Grid Statistik */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                       <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md"><Target size={12}/></div>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Nilai Awal</span>
                       </div>
                       <p className="font-bold text-gray-800 text-sm">Rp {Number(selectedBarang.nilai_perolehan || 0).toLocaleString("id-ID")}</p>
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                       <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-rose-100 text-rose-600 rounded-md"><TrendingDown size={12}/></div>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Depresiasi/Hari</span>
                       </div>
                       <p className="font-bold text-gray-800 text-sm">Rp {Number(selectedBarang.depresiasi_per_hari || 0).toLocaleString("id-ID")}</p>
                    </div>
                  </div>

                  {/* 3. Detail List (REVISI: UMUR & REVALUASI) */}
                  <div>
                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <TrendingUp size={14}/> Valuasi & Umur
                    </h3>
                    <div className="bg-white border border-gray-100 rounded-2xl p-1 shadow-sm">
                      <div className="divide-y divide-gray-50">
                        
                        {/* ITEM 1: UMUR ASET (Tetap Ada) */}
                        <div className="flex justify-between p-3  transition rounded-t-xl">
                          <div className="flex flex-col">
                             <span className="text-xs text-gray-500">Umur Aset Berjalan</span>
                             <span className="text-[9px] text-gray-400 mt-0.5">Sejak tanggal revaluasi</span>
                          </div>
                          <span className="text-xs font-bold text-gray-800 self-center">
                             {selectedBarang.umur_hari || 0} Hari
                          </span>
                        </div>

                        {/* ITEM 3: INFO REVALUASI TERAKHIR */}
                        <div className="flex justify-between p-3  transition rounded-b-xl">
                          <span className="text-xs text-gray-500 self-center">Terakhir Direvaluasi</span>
                          
                          {selectedBarang.tgl_revaluasi ? (
                            <div className="text-right">
                                <span className="block text-xs font-bold text-gray-800">
                                  {new Date(selectedBarang.tgl_revaluasi).toLocaleDateString("id-ID", { month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-gray-400 italic self-center">
                              - (Belum pernah)
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                  {/* --- BAGIAN BARU: RIWAYAT EVOLUSI NILAI --- */}
                  <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <History size={14}/> Riwayat Perubahan Nilai
                      </h3>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[9px] font-bold">
                        Total Revaluasi: {selectedBarang.revaluations?.length || 0} Kali
                      </span>
                    </div>

                    <div className="relative border-l-2 border-indigo-100 ml-3 space-y-8 pb-4">
                      {/* TAMPILKAN HANYA 1 DATA TERBARU */}
                      {selectedBarang.revaluations && selectedBarang.revaluations.length > 0 ? (
                        <>
                          {/* Mengambil index 0 saja (asumsi data sudah terurut dari yang terbaru) */}
                          <div key={selectedBarang.revaluations[0].id} className="relative pl-6 animate-in slide-in-from-bottom-2">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm ring-1 ring-indigo-100"></div>
                            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block mb-1">
                                    Revaluasi Terbaru (#{selectedBarang.revaluations.length})
                                  </span>
                                  <h4 className="font-bold text-gray-800 text-sm">
                                    Menjadi Rp {Number(selectedBarang.revaluations[0].nilai_baru).toLocaleString("id-ID")}
                                  </h4>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                                    {new Date(selectedBarang.revaluations[0].tanggal_revaluasi).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>

                              {/* Tombol Lihat Selengkapnya */}
                              <button 
                                onClick={() => setShowAllHistory(true)}
                                className="mt-3 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                              >
                                Lihat Riwayat Lengkap ({selectedBarang.revaluations.length} data) →
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="relative pl-6">
                          <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-gray-300"></div>
                          <p className="text-xs text-gray-400 italic">Belum ada riwayat revaluasi aset.</p>
                        </div>
                      )}

                      {/* DATA PEROLEHAN AWAL TETAP DI BAWAH SEBAGAI AKAR */}
                      <div className="relative pl-6 opacity-70">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-400 border-4 border-white shadow-sm ring-1 ring-gray-100"></div>
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">Perolehan Awal</span>
                              <h4 className="font-bold text-gray-700 text-sm">
                                Beli Rp {Number(selectedBarang.nilai_perolehan).toLocaleString("id-ID")}
                              </h4>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400">
                              {new Date(selectedBarang.tanggal_perolehan).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
            </div>

            {/* 4. Footer Panel */}
            <div className="sticky bottom-0 p-5 bg-white border-t flex items-center gap-3">
              {selectedBarang.status?.toLowerCase() === 'tersedia' && activeTab === 'info' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenLaporan(selectedBarang);
                  }}
                  className="flex-1 py-3 border border-rose-200 text-rose-600 rounded-xl font-bold text-[10px] uppercase tracking-widest 
                            hover:bg-rose-50 transition flex items-center justify-center gap-2"
                >
                  <AlertTriangle size={14} />
                  Lapor Masalah
                </button>
              )}

              {/* --- BUTTON B: REVALUASI ASET (Hanya di Tab Financial - BARU) --- */}
              {activeTab === 'financial' && (
                <button
                  type="button"
                  onClick={() => setShowRevalModal(true)} // <--- UBAH JADI INI
                  className="flex-1 py-3 border border-indigo-200 text-indigo-600 rounded-xl font-bold text-[10px] uppercase tracking-widest 
                          hover:bg-indigo-50 transition flex items-center justify-center gap-2"
                >
                  <TrendingUp size={14} />
                  Revaluasi Aset
                </button>
              )}

              <button
                onClick={closeDetailModal}
                className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest
                          hover:bg-black transition shadow-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER DRAWER - Menggunakan updateParams */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-end z-[120]" onClick={() => setShowFilterModal(false)}>
          <div className="bg-white w-72 h-full shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b pb-4 shrink-0">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-gray-800"><Sliders size={16}/> Filter Aset</h3>
                <button onClick={() => setShowFilterModal(false)} className="p-1.5 hover:bg-gray-50 rounded-full transition"><X size={18}/></button>
            </div>
            <div className="space-y-6 flex-1 overflow-y-auto pr-1 no-scrollbar text-left">
                <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Lokasi</label>
                    <select className="w-full p-2 border rounded-lg bg-gray-50 mt-1 outline-none text-xs font-bold text-gray-700" value={filterLokasi} onChange={e => updateParams({ lokasi: e.target.value })}>
                        <option value="">Semua Lokasi</option>
                        {lokasi.map(l => <option key={l.id_lokasi} value={String(l.id_lokasi)}>{l.nama_lokasi}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Kategori</label>
                    <select className="w-full p-2 border rounded-lg bg-gray-50 mt-1 outline-none text-xs font-bold text-gray-700" value={filterKategori} onChange={e => updateParams({ kategori: e.target.value })}>
                        <option value="">Semua Kategori</option>
                        {kategori.map(k => <option key={k.id_kategori} value={String(k.id_kategori)}>{k.nama_kategori}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                    <select className="w-full p-2 border rounded-lg bg-gray-50 mt-1 outline-none text-xs font-bold text-gray-700" value={filterStatus} onChange={e => updateParams({ status: e.target.value })}>
                        <option value="">Semua Status</option>
                        <option value="tersedia">Tersedia</option>
                        <option value="dihapus">Dihapus</option>
                        <option value="diperbaiki">Diperbaiki</option>
                    </select>
                </div>
            </div>
            <div className="pt-6 border-t mt-auto flex gap-2">
                <button onClick={handleClearFilters} className="flex-1 py-2 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 rounded-lg transition">Reset</button>
                <button onClick={() => setShowFilterModal(false)} className="flex-1 py-2 bg-gray-800 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-gray-200 tracking-widest">Terapkan</button>
            </div>
          </div>
        </div>
      )}

      {/* SCANNER TETAP SAMA */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[130] p-4 backdrop-blur-md">
          <div className="bg-white p-5 rounded-[2rem] w-full max-w-sm relative animate-in zoom-in-95">
            <button onClick={() => setIsScanning(false)} className="absolute -top-12 right-0 text-white hover:text-red-400 transition"><X size={32}/></button>
            <div id="reader" className="overflow-hidden rounded-2xl border-4 border-gray-100"></div>
          </div>
        </div>
      )}

      {/* MODAL FORM LAPORAN KERUSAKAN */}
      {showLaporanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[130] p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-rose-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                  <AlertTriangle size={20} />
                </div>
                <h2 className="text-lg font-black text-gray-800 tracking-tight">Lapor Kerusakan</h2>
              </div>
              <button onClick={handleCancelLaporan} className="text-gray-400 hover:text-red-500 transition">
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={submitLaporan} className="p-6 space-y-5 overflow-y-auto no-scrollbar">
              {/* Autocomplete Pelapor */}
              <AutocompleteInput 
                label="Nama Pelapor" 
                placeholder="Cari nama penanggung jawab..." 
                value={laporanData.pj_nama} 
                data={penanggungjawab} 
                fieldName="nama_pegawai" 
                onSelect={(item) => setLaporanData({
                  ...laporanData, 
                  id_penanggungjawab: item.id_penanggungjawab, 
                  pj_nama: item.nama_pegawai 
                })} 
              />

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tingkat Kerusakan</label>
                <select 
                  className="w-full border p-2.5 text-sm rounded-lg bg-gray-50 border-gray-200 outline-none focus:ring-2 focus:ring-rose-500"
                  value={laporanData.tingkat}
                  onChange={e => setLaporanData({...laporanData, tingkat: e.target.value})}
                >
                  <option value="rusak ringan">Rusak Ringan</option>
                  <option value="rusak berat">Rusak Berat</option>
                </select>
              </div>

              <div className="text-left">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Deskripsi Kerusakan</label>
                <textarea 
                  className="w-full border p-3 text-sm rounded-xl bg-gray-50 border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none min-h-[120px]"
                  value={laporanData.deskripsi}
                  onChange={e => setLaporanData({...laporanData, deskripsi: e.target.value})}
                  placeholder="Jelaskan detail kerusakan aset..."
                  required
                />
              </div>
            </form>

            <div className="p-5 bg-gray-50 border-t flex justify-end gap-2">
              <button type="button" onClick={handleCancelLaporan} className="px-5 py-2 text-[10px] font-black uppercase text-gray-500 hover:text-gray-700">Batal</button>
              <button onClick={submitLaporan} className="px-6 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-700 transition flex items-center gap-2">
                Kirim Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {showAllHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[130] p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header Modal - Mengikuti style Laporan */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <History size={20} />
                </div>
                <h2 className="text-lg font-black text-gray-800 tracking-tight">Riwayat Revaluasi</h2>
              </div>
              <button onClick={() => setShowAllHistory(false)} className="text-gray-400 hover:text-indigo-500 transition">
                <X size={20}/>
              </button>
            </div>

            {/* Konten Modal - Scrollable */}
            <div className="p-6 overflow-y-auto no-scrollbar space-y-5">
              <div className="relative border-l-2 border-indigo-100 ml-3 space-y-8 pb-4">
                {selectedBarang.revaluations.map((rev, index) => (
                  <div key={rev.id} className="relative pl-6">
                    {/* Dot Indikator */}
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm ring-1 ring-indigo-100"></div>
                    
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block mb-1">
                            Revaluasi #{selectedBarang.revaluations.length - index}
                          </span>
                          <h4 className="font-bold text-gray-800 text-sm">
                            Menjadi Rp {Number(rev.nilai_baru).toLocaleString("id-ID")}
                          </h4>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                            {new Date(rev.tanggal_revaluasi).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 text-[11px] grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <span className="block text-[8px] text-gray-400 font-bold uppercase">NBV Sebelumnya</span>
                          <span className="font-medium text-gray-600">Rp {Number(rev.nbv_saat_ini).toLocaleString("id-ID")}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-gray-400 font-bold uppercase">Surplus/Defisit</span>
                          <span className={`font-bold ${Number(rev.surplus_deficit) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {Number(rev.surplus_deficit) >= 0 ? '+' : ''} Rp {Number(rev.surplus_deficit).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-gray-200">
                          <span className="block text-[8px] text-gray-400 font-bold uppercase text-left">Keterangan</span>
                          <p className="text-gray-600 italic mt-0.5">"{rev.keterangan || '-'}"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Akar Sejarah (Perolehan Awal) */}
                <div className="relative pl-6 opacity-60">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-400 border-4 border-white"></div>
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                    <span className="text-[10px] font-black text-gray-500 uppercase block mb-1">Perolehan Awal</span>
                    <h4 className="font-bold text-gray-700 text-sm">
                      Rp {Number(selectedBarang.nilai_perolehan).toLocaleString("id-ID")}
                    </h4>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-5 bg-gray-50 border-t flex justify-end">
              <button 
                onClick={() => setShowAllHistory(false)} 
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REVALUASI (DIPANGGIL DISINI) */}
      {showRevalModal && selectedBarang && (
        <RevaluationModal 
            barang={selectedBarang}
            onClose={() => setShowRevalModal(false)}
            onSuccess={() => {
                fetchBarang(); // Refresh tabel utama
                // Refresh modal detail yang sedang terbuka agar angka langsung berubah
                handleDetailClick(selectedBarang.id_barang); 
            }}
        />
      )}
    </div>
  );
}