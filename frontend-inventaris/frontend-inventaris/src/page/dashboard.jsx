import { useNavigate } from 'react-router-dom';
import { 
    Package, Trash2, Wrench, ChevronLeft, ChevronRight, Calendar, 
    CheckCircle, TrendingUp, ArrowDownCircle, PieChart, MapPin, Activity, 
    Layers, Loader2, QrCode, X 
} from "lucide-react";
import React, { useState, useEffect, useCallback } from 'react'; 
import { Bar, Chart, Doughnut } from 'react-chartjs-2'; 
import { Html5QrcodeScanner } from "html5-qrcode";
import toast, { Toaster } from 'react-hot-toast';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
    Title, Tooltip, Legend, Filler, BarElement, ArcElement, LineController,
    BarController,
    DoughnutController
} from 'chart.js';

import api from '../api/axiosConfig'; 

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement, Title, 
    Tooltip, Legend, Filler, BarElement, ArcElement, LineController, BarController, DoughnutController
);

// --- 1. KONSTANTA ---
const SERVICE_DETAIL_PATH = '/pemeliharaan'; 
const SERVICE_COST_PATH = '/pemeliharaan/monthly-cost'; 
const ACQUISITION_COST_PATH = '/barang/monthly-acquisition';
const DEPRECIATION_COST_PATH = '/barang/monthly-depreciation'; 
const NBV_COST_PATH = '/barang/monthly-nbv'; 
const STATS_PATH = '/barang/summary-stats'; 
const LOKASI_PATH = '/lokasi';
const KATEGORI_PATH = '/kategori'; 
const LATEST_ACTIVITIES_PATH = '/peminjaman/latest-activities';

// --- 2. KOMPONEN PEMBANTU ---
// [UPDATE] CardLoader dibuat lebih "terlihat" dengan backdrop-blur
const CardLoader = () => (
    <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center bg-white/80 backdrop-blur-[2px] z-20 rounded-2xl transition-all duration-300">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest animate-pulse">Memuat Data...</span>
    </div>
);

const CategoryRow = ({ label, value, total, color }) => {
    const [isHovered, setIsHovered] = useState(false);
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

    return (
        <div 
            className="relative mb-3 last:mb-0" 
            onMouseEnter={() => setIsHovered(true)} 
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex justify-between items-end mb-1.5">
                <p className="text-[11px] font-bold text-gray-700">{label}</p>
                <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-white transition-all duration-300 transform ${
                        isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-95 pointer-events-none'
                    }`}>
                        {value} Unit
                    </span>
                    <span className="text-[11px] font-black text-gray-400 w-8 text-right">{percentage}%</span>
                </div>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden cursor-default">
                <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                        width: `${percentage}%`, 
                        backgroundColor: color,
                        filter: isHovered ? 'brightness(1.1)' : 'none' 
                    }} 
                />
            </div>
        </div>
    );
};

const ModernDashboardCard = ({ item, onClick }) => (
    <div 
        onClick={onClick}
        className="relative bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all duration-300 group overflow-hidden text-left cursor-pointer"
    >
        <div className={`absolute top-0 right-0 w-16 h-16 -mr-6 -mt-6 rounded-full opacity-5 bg-gradient-to-br ${item.color} group-hover:scale-150 transition-transform duration-500`}></div>
        <div className="flex items-center gap-3 relative z-10">
            <div className={`p-2.5 rounded-lg bg-gradient-to-br ${item.color} text-white shadow-lg shadow-gray-200 group-hover:scale-110 transition-transform`}>
                {React.cloneElement(item.icon, { size: 20 })}
            </div>
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-gray-800 tracking-tight">{item.value}</h3>
                </div>
            </div>
        </div>
    </div>
);

const ServiceItemCard = ({ item }) => {
    const navigate = useNavigate();

    return (
        <div 
            // Menambahkan navigasi dan cursor pointer
            onClick={() => navigate(`/AssetMaintenance?id=${item.id_pemeliharaan}`)}
            // Mempertahankan style asli Anda: py-2, hover:px-2, transition-all
            className="flex items-center justify-between py-2 border-b border-gray-50 hover:px-2 transition-all group cursor-pointer"
        >
            <div className="flex flex-col min-w-0">
                {/* NAMA BARANG - text-[11px] */}
                <span className="text-[11px] font-bold text-gray-700 group-hover:text-blue-600 transition-colors truncate">
                    {item.barang?.nama_barang || item.nama_barang || "Tanpa Nama"}
                </span>
                {/* KETERANGAN - text-[9px] */}
                <span className="text-[9px] text-gray-400 line-clamp-1">{item.keterangan || "Tidak ada keterangan"}</span>
            </div>

            <div className="text-right flex flex-col items-end shrink-0 ml-2">
                {/* TANGGAL - text-[10px] font-black */}
                <span className="text-[10px] font-black text-gray-800 tracking-tighter">
                    {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { 
                        day: 'numeric', 
                        month: 'short' 
                    }) : '-'}
                </span>
                {/* STATUS - text-[9px] yellow-500 */}
                <span className="text-[9px] text-yellow-500 font-bold uppercase">
                    Proses
                </span>
            </div>
        </div>
    );
};

// --- 3. KOMPONEN UTAMA ---
export default function Dashboard() {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [loadingCharts, setLoadingCharts] = useState(false); // Default false, dihandle useEffect
    const [loadingService, setLoadingService] = useState(true);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    const navigate = useNavigate();

    const [dashboardItems, setDashboardItems] = useState([
        { value: '0 Unit', label: "Total Aset", color: "from-sky-400 to-sky-600", icon: <Package />, key: 'total_assets', path: '/Assets' }, 
        { value: '0 Unit', label: "Aset Aktif", color: "from-emerald-500 to-emerald-700", icon: <CheckCircle />, key: 'active_assets', path: '/Assets?status=tersedia&page=1' },
        { value: '0 Unit', label: "Aset Dihapus", color: "from-rose-400 to-rose-600", icon: <Trash2 />, key: 'deleted_assets', path: '/Assets?status=dihapus&page=1' }, 
        { value: '0 Unit', label: "Aset Diperbaiki", color: "from-amber-400 to-amber-600", icon: <Wrench />, key: 'repaired_assets', path: '/Assets?status=diperbaiki&page=1' },
    ]);

    const financialItems = [
        { label: "Nilai Perolehan", key: 'total_acquisition', icon: <TrendingUp size={20}/>, textColor: 'text-indigo-600', bgColor: 'bg-indigo-50' },
        { label: "Akumulasi Depresiasi", key: 'total_depreciation', icon: <ArrowDownCircle size={20}/>, textColor: 'text-rose-600', bgColor: 'bg-rose-50' },
        { label: "Nilai Buku Bersih", key: 'total_value_financial', icon: <PieChart size={20}/>, textColor: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    ];

    const [finValues, setFinValues] = useState({ total_acquisition: 'Rp 0', total_depreciation: 'Rp 0', total_value_financial: 'Rp 0' });
    const [currentFinIndex, setCurrentFinIndex] = useState(0);
    const [currentChartIndex, setCurrentChartIndex] = useState(0);
    const [currentVisualIndex, setCurrentVisualIndex] = useState(0); 
    const [serviceItems, setServiceItems] = useState([]);
    const [activities, setActivities] = useState([]);

    const [acqChart, setAcqChart] = useState({ labels: [], datasets: [] });
    const [nbvChart, setNbvChart] = useState({ labels: [], datasets: [] });
    const [compChart, setCompChart] = useState({ labels: [], datasets: [] });
    const [svcChart, setSvcChart] = useState(null);
    const [locationChart, setLocationChart] = useState({ labels: [], datasets: [] });
    const [categoryChart, setCategoryChart] = useState({ labels: [], datasets: [] });

    const formatCompact = (val) => {
        if (!val) return 'Rp 0';
        const units = [{ v: 1e12, s: ' T' }, { v: 1e9, s: ' M' }, { v: 1e6, s: ' Jt' }];
        for (let u of units) { if (Math.abs(val) >= u.v) return `Rp ${(val / u.v).toFixed(1)}${u.s}`; }
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    const tooltipCurrencyFormat = (value) => {
        const val = value * 1e6;
        if (val >= 1e9) return `Rp ${(val / 1e9).toFixed(1)} Miliar`;
        if (val >= 1e6) return `Rp ${(val / 1e6).toFixed(1)} Juta`;
        return `Rp ${val.toLocaleString('id-ID')}`;
    };

    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { display: false },
            tooltip: { callbacks: { label: (context) => ` Nilai: ${tooltipCurrencyFormat(context.raw)}` } }
        },
        scales: {
            x: { ticks: { font: { size: 9 } } },
            y: { beginAtZero: true, ticks: { font: { size: 9 }, callback: (value) => value + ' Jt' } }
        }
    };

    // --- FUNGSI 1: FETCH DATA UMUM (Hanya jalan 1x atau saat perlu refresh total) ---
    // [OPTIMASI] Kita hapus dependency 'selectedYear' dari sini agar tidak reload semua hal saat ganti tahun
    const fetchMainData = useCallback(async () => {
        setLoadingService(true);
        setLoadingActivities(true);
        
        try {
            const [resStats, resLokasi, resKategori, resLogs, resSvcDetail] = await Promise.all([
                api.get(STATS_PATH), 
                api.get(LOKASI_PATH),
                api.get(KATEGORI_PATH),
                api.get(LATEST_ACTIVITIES_PATH),
                api.get(SERVICE_DETAIL_PATH, { params: { status_pemeliharaan: 'belum_selesai', Limit: 5} })
            ]);

            // 1. UPDATE KARTU UTAMA
            const stats = resStats.data.data;
            setDashboardItems(prev => prev.map(item => {
                const value = stats[item.key]; 
                return { ...item, value: `${value || 0} Unit` };
            }));

            const acq = parseFloat(stats.total_acquisition) || 0;
            const nbv = parseFloat(stats.total_nbv) || 0;
            const dep = acq - nbv;

            setFinValues({ 
                total_acquisition: formatCompact(acq), 
                total_depreciation: formatCompact(dep), 
                total_value_financial: formatCompact(nbv) 
            });

            // 2. UPDATE CHART LOKASI & KATEGORI
            const processChartData = (raw, labelKey, countKey, colors) => {
                const sorted = [...raw].sort((a, b) => (b[countKey] || 0) - (a[countKey] || 0));
                const top5 = sorted.slice(0, 5);
                const others = sorted.slice(5).reduce((acc, curr) => acc + (curr[countKey] || 0), 0);
                return {
                    labels: [...top5.map(l => l[labelKey]), ...(others > 0 ? ['Lainnya'] : [])],
                    datasets: [{ 
                        data: [...top5.map(l => l[countKey] || 0), ...(others > 0 ? [others] : [])], 
                        backgroundColor: colors, borderWidth: 0, cutout: '80%' 
                    }]
                };
            };

            if(resLokasi.data.data) {
                setLocationChart(processChartData(resLokasi.data.data, 'nama_lokasi', 'barang_count', ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#94a3b8']));
            }
            if(resKategori.data.data) {
                setCategoryChart(processChartData(resKategori.data.data, 'nama_kategori', 'barang_count', ['#6366f1', '#ec4899', '#f97316', '#14b8a6', '#8b5cf6', '#cbd5e1']));
            }

            setActivities(resLogs.data.data || []);
            setServiceItems(resSvcDetail.data.data || []);
            
        } catch (e) { 
            console.error("Error fetching main data", e);
            toast.error("Gagal memuat data statistik");
        } finally {
            setLoadingActivities(false);
            setLoadingService(false);
        }
    }, []);

    // --- FUNGSI 2: FETCH CHART TAHUNAN (Jalan setiap ganti tahun) ---
    // [OPTIMASI] Fungsi ini dipisah agar loading-nya spesifik untuk grafik
    const fetchChartData = useCallback(async (year) => {
        setLoadingCharts(true); // LANGSUNG TAMPILKAN LOADING
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        try {
            // Kita beri delay sedikit (opsional) jika API terlalu cepat agar user sadar ada refresh
            // await new Promise(r => setTimeout(r, 300)); 

            const [rAcq, rDep, rNbv, rSvc] = await Promise.all([
                api.get(ACQUISITION_COST_PATH, { params: { year } }), 
                api.get(DEPRECIATION_COST_PATH, { params: { year } }),
                api.get(NBV_COST_PATH, { params: { year } }), 
                api.get(SERVICE_COST_PATH, { params: { year } })
            ]);
            
            const parse = (res, key) => months.map(m => (res.data.data?.find(d => d.month_year === m)?.[key] || 0) / 1e6);
            
            setAcqChart({ labels: months, datasets: [{ label: 'Akuisisi', data: parse(rAcq, 'total_cost'), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)', fill: true, tension: 0.4 }] });
            setNbvChart({ labels: months, datasets: [{ label: 'NBV', data: parse(rNbv, 'total_nbv'), borderColor: '#10b981', tension: 0.4 }] });
            setCompChart({ labels: months, datasets: [{ type: 'line', label: 'Akuisisi', data: parse(rAcq, 'total_cost'), borderColor: '#3b82f6', tension: 0.2 }, { type: 'line', label: 'Depresiasi', data: parse(rDep, 'total_depreciation_cost'), borderColor: '#ef4444', tension: 0.2 }] });
            setSvcChart({ labels: months, datasets: [{ label: 'Biaya Servis', data: parse(rSvc, 'total_cost'), backgroundColor: '#6366f1', borderRadius: 6 }] });
            
        } catch (e) { 
            console.error(e); 
            toast.error("Gagal memuat grafik");
        } finally {
            setLoadingCharts(false); // MATIKAN LOADING
        }
    }, []);

    // --- USE EFFECT 1: Load Data Umum (Sekali saja saat mount) ---
    useEffect(() => { 
        fetchMainData(); 
    }, [fetchMainData]);

    // --- USE EFFECT 2: Load Grafik (Setiap selectedYear berubah) ---
    useEffect(() => {
        fetchChartData(selectedYear);
    }, [selectedYear, fetchChartData]);


    // --- USE EFFECT SCANNER ---
    useEffect(() => {
        let scanner;
        if (isScanning) {
            scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
            scanner.render(async (decodedText) => {
            try {
                setIsScanning(false);
                if (scanner) scanner.clear().catch(console.error);
                setIsSearching(true); 

                const response = await api.get(`/barang?search=${decodedText}&page=1`);
                const resultData = response.data.data; 
                const found = resultData.find(item => item.kode_barang === decodedText);

                await new Promise(resolve => setTimeout(resolve, 800));

                if (found) {
                    const harga = parseFloat(found.nilai_perolehan) || 0;
                    const tgl = new Date(found.tanggal_perolehan);
                    const masa = found.kategori?.masa_manfaat_tahun || 5;
                    const totalHari = masa * 365;
                    const hariBerjalan = Math.floor((new Date() - tgl) / (1000 * 60 * 60 * 24));
                    const kalkulasiNbv = hariBerjalan >= totalHari ? 0 : Math.max(harga - (harga / totalHari * hariBerjalan), 0);

                    setScanResult({
                        ...found,
                        id: found.id_barang,
                        nilai_nbv: kalkulasiNbv
                    });
                    toast.success("Aset ditemukan!");
                } else {
                    toast.error(`Aset dengan kode ${decodedText} tidak ditemukan.`);
                }
            } catch (err) {
                console.error(err);
                toast.error("Gagal memproses data");
            } finally {
                setIsSearching(false);
            }
        });
        }
        return () => { if (scanner) scanner.clear().catch(() => {}); };
    }, [isScanning]);

    const chartConfigs = [
        { title: "Tren Pengeluaran Aset Bulanan", data: acqChart, type: 'line' },
        { title: "Tren Nilai Buku (NBV) Agregat", data: nbvChart, type: 'line' },
        { title: "Akuisisi vs Depresiasi", data: compChart, type: 'line' }
    ];

    const visualConfigs = [
        { title: "Sebaran Per Lokasi", icon: <MapPin size={16} className="text-blue-500" />, type: 'doughnut', data: locationChart },
        { title: "Sebaran Per Kategori", icon: <Layers size={16} className="text-indigo-500" />, type: 'progress', data: categoryChart }
    ];

    const activeFin = financialItems[currentFinIndex];

    return (
        <div className="min-h-screen p-4 lg:p-5 bg-gray-50/20 text-left relative">
            <Toaster position="top-right" />
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 text-black">
                <div>
                    <h2 className="text-xl lg:text-2xl font-black tracking-tight leading-none mb-1">Dashboard Manajemen Aset</h2>
                    <p className="text-[12px] text-gray-400 font-medium">Monitoring operasional, valuasi keuangan, dan distribusi aset.</p>
                </div>
                <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 self-start md:self-center">
                    <Calendar size={16} className="text-blue-500" />
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-transparent font-bold text-gray-700 outline-none cursor-pointer text-xs">
                        {[currentYear-2, currentYear-1, currentYear, currentYear+1, currentYear+2].map(y => <option key={y} value={y}>Tahun {y}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {dashboardItems.map((item, i) => (
                    <ModernDashboardCard key={i} item={item} onClick={() => navigate(item.path)} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 text-black items-stretch">
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative h-[300px] md:h-[350px] lg:h-[400px]">
                        
                        {/* LOADING CIRCLE AKAN MUNCUL DISINI */}
                        {loadingCharts && <CardLoader />} 

                        <div className="flex justify-between items-center mb-5 text-[9px] lg:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <h4>{chartConfigs[currentChartIndex].title}</h4>
                            <div className="flex gap-1.5">
                                <button onClick={() => setCurrentChartIndex((currentChartIndex + 2) % 3)} className="p-1 hover:text-blue-500 transition-colors"><ChevronLeft size={18}/></button>
                                <button onClick={() => setCurrentChartIndex((currentChartIndex + 1) % 3)} className="p-1 hover:text-blue-500 transition-colors"><ChevronRight size={18}/></button>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 relative"><Chart type={chartConfigs[currentChartIndex].type} data={chartConfigs[currentChartIndex].data} options={commonChartOptions} /></div>
                    </div>
                    <div className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative h-[250px] md:h-[300px] lg:h-[350px]">
                        
                        {/* LOADING CIRCLE AKAN MUNCUL DISINI JUGA */}
                        {loadingCharts && <CardLoader />}

                        <h4 className="text-[9px] lg:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Distribusi Biaya Servis Bulanan</h4>
                        <div className="flex-1 min-h-0 relative">{svcChart && <Bar data={svcChart} options={commonChartOptions} />}</div>
                    </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-6 h-full">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between group h-[280px]">
                        <div className="flex justify-between items-center">
                            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Analisis Keuangan</h4>
                            <div className="flex gap-1">
                                <button onClick={() => setCurrentFinIndex((currentFinIndex + 2) % 3)} className="p-1 hover:text-blue-500 transition-colors"><ChevronLeft size={18}/></button>
                                <button onClick={() => setCurrentFinIndex((currentFinIndex + 1) % 3)} className="p-1 hover:text-blue-500 transition-colors"><ChevronRight size={18}/></button>
                            </div>
                        </div>
                        <div className="flex-grow flex flex-col items-center justify-center text-center">
                            <div className={`mb-3 p-4 rounded-2xl ${activeFin.bgColor} ${activeFin.textColor} shadow-inner`}>{activeFin.icon}</div>
                            <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">{activeFin.label}</p>
                            <h2 className={`text-xl lg:text-2xl font-black ${activeFin.textColor} tracking-tight`}>{finValues[activeFin.key]}</h2>
                        </div>
                        <div className="flex justify-center gap-1.5 mt-2">
                            {financialItems.map((_, i) => (<div key={i} className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${i === currentFinIndex ? 'w-6 bg-blue-500' : 'w-1 bg-gray-200'}`} onClick={() => setCurrentFinIndex(i)} />))}
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col relative overflow-hidden z-10 shadow-lg shadow-gray-200/40 flex-1 min-h-[400px]">
                        {loadingService && <CardLoader />}
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Aset dalam Perbaikan</h4>
                        <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
                            {serviceItems.length > 0 ? serviceItems.map((item, i) => <ServiceItemCard key={i} item={item} />) : (
                                <div className="py-8 h-full flex flex-col items-center justify-center text-gray-400 italic text-[11px]"><CheckCircle size={32} className="mb-2 opacity-20" />Semua aset baik</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6 text-black items-start"> 
                <div className="lg:col-span-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative h-auto lg:min-h-[420px]">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            {visualConfigs[currentVisualIndex].icon}
                            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{visualConfigs[currentVisualIndex].title}</h4>
                        </div>
                        <div className="flex gap-0.5">
                            <button onClick={() => setCurrentVisualIndex((currentVisualIndex + 1) % 2)} className="p-1 hover:text-blue-500 transition-colors"><ChevronLeft size={18}/></button>
                            <button onClick={() => setCurrentVisualIndex((currentVisualIndex + 1) % 2)} className="p-1 hover:text-blue-500 transition-colors"><ChevronRight size={18}/></button>
                        </div>
                    </div>
                    
                    <div className="flex-grow">
                        {visualConfigs[currentVisualIndex].type === 'doughnut' ? (
                            <div className="flex flex-col h-full items-center">
                                <div className="h-[160px] lg:h-[180px] w-full relative mb-4 flex items-center justify-center">
                                    <Doughnut data={visualConfigs[currentVisualIndex].data} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-xl font-black text-gray-800">{dashboardItems[0].value.split(' ')[0]}</span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Unit</span>
                                    </div>
                                </div>
                                <div className="w-full space-y-2">
                                    {visualConfigs[currentVisualIndex].data.labels?.slice(0, 5).map((label, i) => (
                                        <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-1 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: visualConfigs[currentVisualIndex].data.datasets[0].backgroundColor[i] }}></div>
                                                <span className="text-[11px] font-bold text-gray-700">{label}</span>
                                            </div>
                                            <span className="text-[11px] font-black text-gray-400">{visualConfigs[currentVisualIndex].data.datasets[0].data[i]} Unit</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 pt-1">
                                {visualConfigs[currentVisualIndex].data.labels?.map((label, i) => (
                                    <CategoryRow key={i} label={label} value={visualConfigs[currentVisualIndex].data.datasets[0].data[i]} total={visualConfigs[currentVisualIndex].data.datasets[0].data.reduce((a, b) => a + b, 0)} color={visualConfigs[currentVisualIndex].data.datasets[0].backgroundColor[i]} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-8 bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative h-auto lg:min-h-[420px]">
                    {loadingActivities && <CardLoader />}
                    <div className="flex items-center gap-2 mb-6">
                        <Activity size={16} className="text-emerald-500" />
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Log Aktivitas Terbaru</h4>
                    </div>
                    <div className="flex-grow overflow-x-auto no-scrollbar">
                        <table className="w-full text-left min-w-[500px]">
                            <thead className="border-b border-gray-100">
                                <tr>
                                    <th className="pb-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Aktivitas</th>
                                    <th className="pb-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Unit Aset</th>
                                    <th className="pb-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Tanggal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {activities.length > 0 ? activities.slice(0, 10).map((log, i) => (
                                    <tr key={i} className="group hover:bg-gray-50/40 transition-colors">
                                        <td className="py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 rounded bg-blue-50 text-blue-600"><Activity size={12} /></div>
                                                <span className="text-[11px] font-bold text-gray-700">{log.tipe}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5">
                                            <p className="text-[11px] font-bold text-gray-700 leading-none">{log.nama_barang}</p>
                                            <p className="text-[9px] text-gray-400 uppercase mt-0.5">{log.kode_barang}</p>
                                        </td>
                                        <td className="py-2.5 text-right"><span className="text-[9px] font-black text-gray-400 uppercase">{new Date(log.created_at).toLocaleDateString('id-ID')}</span></td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="3" className="py-16 text-center text-gray-400 text-[11px] italic">Belum ada histori aktivitas</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <button 
                onClick={() => setIsScanning(true)} 
                className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 p-3.5 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all duration-300 z-40 group flex items-center gap-2"
            >
                <QrCode size={24} className="group-hover:rotate-12 transition-transform" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold text-xs whitespace-nowrap px-0 group-hover:px-1">Scan Pencarian Aset</span>
            </button>

            {isScanning && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white p-5 rounded-3xl w-full max-w-sm relative shadow-2xl">
                        <button onClick={() => setIsScanning(false)} className="absolute -top-10 right-0 text-white hover:text-red-400 transition"><X size={28}/></button>
                        <div className="text-center mb-3"><h3 className="font-black text-lg text-gray-800">Scan QR Aset</h3></div>
                        <div id="reader" className="overflow-hidden rounded-xl border-2 border-gray-100 shadow-inner"></div>
                    </div>
                </div>
            )}

            {scanResult && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
                            <button onClick={() => setScanResult(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"><X size={20}/></button>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80 mb-0.5">{scanResult.kode_barang}</p>
                            <h3 className="text-lg lg:text-xl font-black leading-tight">{scanResult.nama_barang}</h3>
                        </div>
                        <div className="p-5 space-y-4 text-black">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Status</p>
                                    <span className={`text-[11px] font-bold uppercase ${scanResult.status?.toLowerCase() === 'tersedia' ? 'text-emerald-600' : 'text-blue-600'}`}>{scanResult.status}</span>
                                </div>
                                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Kondisi</p>
                                    <span className="text-[11px] font-bold text-gray-700 uppercase">{scanResult.kondisi}</span>
                                </div>
                            </div>
                            <div className="space-y-2.5 py-1">
                                <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-1.5">
                                    <span className="text-gray-400 font-medium">Lokasi</span>
                                    <span className="font-bold text-gray-800">{scanResult.lokasi?.nama_lokasi || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-1.5">
                                    <span className="text-gray-400 font-medium">Penanggung Jawab</span>
                                    <span className="font-bold text-gray-800">{scanResult.penanggungjawab?.nama_pegawai || '-'}</span>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Nilai Buku (NBV)</p>
                                    <h4 className="text-base lg:text-lg font-black text-blue-700">Rp {Number(scanResult.nilai_nbv || 0).toLocaleString("id-ID")}</h4>
                                </div>
                                <TrendingUp size={18} className="text-blue-500" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setScanResult(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold text-xs rounded-lg hover:bg-gray-200 transition">Tutup</button>
                                <button onClick={() => {
                                    const targetId = scanResult.id_barang || scanResult.id; 
                                    if (targetId) navigate(`/Assets?page=1&id=${targetId}`);
                                    else toast.error("ID Aset tidak ditemukan");
                                }} className="flex-1 py-2.5 bg-gray-800 text-white font-bold text-xs rounded-lg hover:bg-black shadow-lg shadow-gray-200/50 transition">Detail</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isSearching && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm"></div>
                    <div className="relative flex flex-col items-center w-full max-w-[200px]">
                        <div className="w-full h-[2px] bg-gray-100 rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-blue-600 w-1/3 rounded-full animate-infinite-loading"></div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-800 ml-[0.3em]">Memproses</span>
                            <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-gray-400">Mencari Data Aset</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}