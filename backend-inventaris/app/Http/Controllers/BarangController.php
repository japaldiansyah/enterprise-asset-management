<?php

namespace App\Http\Controllers;

use App\Models\Barang;
use App\Models\Pemeliharaan;
use App\Models\Kategori;
use Illuminate\Http\Request;
use Carbon\Carbon; // Diperlukan untuk perhitungan tanggal dan tahun
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;

class BarangController extends Controller
{
    // Menampilkan semua data barang (dengan relasi)
    public function index()
    {
        $totalAsetBarang = Barang::where('status', '!=', 'dihapus')->count();

        $data = Barang::with(['kategori','lokasi','penanggungjawab'])
                  ->latest() 
                  ->get();

        return response()->json([
            'status' => 'success',
            'data' => $data
        ], 200);
    }
    
    // Menyimpan barang baru
    public function store(Request $request)
    {
        // 1. Validasi Data (Aturan validasi yang hilang kini dimasukkan kembali)
        $rules = [
            'kode_barang' => 'required|unique:barang,kode_barang',
            'nama_barang' => 'required|string|max:255',
            'id_kategori' => 'required|exists:kategori,id_kategori',
            'merk' => 'required|string|max:255',
            'tanggal_perolehan' => 'required|date',
            'nilai_perolehan' => 'required|numeric',
            'kondisi' => 'required|in:baik,rusak ringan,rusak berat',
            'status' => 'required|in:tersedia,dipinjam,diperbaiki,dihapus',
            'id_lokasi' => 'required|exists:lokasi,id_lokasi',
            'id_penanggungjawab' => 'required|exists:penanggungjawab,id_penanggungjawab',
        ];

        // 2. Definisikan Pesan Custom dalam Bahasa Indonesia
        $customMessages = [
            'kode_barang.required' => 'Kode barang wajib diisi.',
            'kode_barang.unique'   => 'Kode barang sudah terdaftar, gunakan kode lain.',
            'nama_barang.required' => 'Nama barang tidak boleh kosong.',
            'id_kategori.required' => 'Silakan pilih kategori aset.',
            'id_kategori.exists'   => 'Kategori yang dipilih tidak terdaftar.',
            'id_lokasi.required'   => 'Lokasi aset wajib diisi.',
            'id_lokasi.exists'     => 'Lokasi tidak ditemukan.',
            'id_penanggungjawab.required' => 'Penanggung jawab wajib dipilih.',
            'id_penanggungjawab.exists'   => 'Data penanggung jawab tidak valid.',
            'nilai_perolehan.numeric'     => 'Nilai perolehan harus berupa angka.',
        ];

        // 3. Jalankan Validasi dengan Pesan Custom
        $validated = $request->validate($rules, $customMessages);

        // 2. Ambil kode_barang yang sudah divalidasi (Tidak akan error lagi)
        $kodeBarang = $validated['kode_barang'];
        
        // 3. Tentukan nama file dan path penyimpanan
        $fileName = $kodeBarang . '.png';
        $storagePath = 'qrcodes/' . $fileName; 

        // 4. GENERASI QR CODE
        try {
            $qrContent = $kodeBarang;

            // Membuat QR Code dalam bentuk string biner PNG
            $qrCode = QrCode::format('png')->size(300)->generate($qrContent);

            // Menyimpan file ke storage/app/public/qrcodes/
            Storage::disk('public')->put($storagePath, $qrCode);

            // Tambahkan path ke data yang divalidasi untuk disimpan
            $validated['qr_code_path'] = $storagePath;

        } catch (\Exception $e) {
            \Log::error('Gagal membuat QR Code untuk ' . $kodeBarang . ': ' . $e->getMessage());
        }

        // 5. Simpan data barang ke database (termasuk qr_code_path yang baru)
        $barang = Barang::create($validated);
        $tanggal = Carbon::parse($request->tanggal_perolehan)
                            ->locale('id')
                            ->translatedFormat('d F Y');

        $barang->addLog(
            'Pendaftaran', 
            "Aset telah berhasil ditambahkan pada tanggal {$tanggal}"
        );
        // 6. Respon Sukses
        return response()->json([
            'status' => 'success',
            'message' => 'Barang berhasil ditambahkan dan QR Code telah dibuat',
            'data' => $barang
        ], 201);
    }

    // Menampilkan detail barang (UPDATED WITH REVALUATION LOGIC)
    public function show($id)
    {
        // Eager load relasi revaluations untuk cek history
        $barang = Barang::with([
            'kategori', 
            'lokasi', 
            'penanggungjawab', 
            'pemeliharaan', 
            // URUTKAN RIWAYAT REVALUASI DARI TERBARU
            'revaluations' => function($query) {
                $query->orderBy('tanggal_revaluasi', 'desc');
            }
        ])->find($id);

        if (!$barang) {
            return response()->json([
                'status' => 'error',
                'message' => 'Barang tidak ditemukan'
            ], 404);
        }

        // --- 1. TENTUKAN TANGGAL TARGET ---
        if ($barang->status === 'dihapus') {
            $tglHapusManual = $barang->penghapusan ? $barang->penghapusan->tanggal : $barang->updated_at;
            $targetDate = new \DateTime($tglHapusManual); 
        } else {
            $targetDate = new \DateTime(); 
        }

        // --- 2. CEK APAKAH ADA REVALUASI TERAKHIR? ---
        // Helper 'latest_revaluation' sebaiknya ada di Model Barang, 
        // tapi kita bisa ambil manual dari relation yg sudah di-load.
        $latestReval = $barang->revaluations->sortByDesc('tanggal_revaluasi')->first();

        // Guard: Abaikan revaluasi masa depan (Time Travel Prevention)
        if ($latestReval && new \DateTime($latestReval->tanggal_revaluasi) > $targetDate) {
            $latestReval = null;
        }

        // --- 3. TENTUKAN BASIS PERHITUNGAN (SWITCH LOGIC) ---
        if ($latestReval) {
            // --- KASUS REVALUASI (METODE ELIMINASI) ---
            $hargaDasar = (float) $latestReval->nilai_baru;
            $tanggalStart = new \DateTime($latestReval->tanggal_revaluasi);
            $assetLifeSpanYears = (int) $latestReval->sisa_umur_baru; // Pakai kolom 'sisa_umur_baru'
            $isRevaluated = true;
            
            // Info Surplus untuk UI
            $surplusDeficit = (float) $latestReval->surplus_deficit;
            $nbvSaatReval = (float) $latestReval->nbv_saat_ini;
        } else {
            // --- KASUS NORMAL (HISTORICAL COST) ---
            $hargaDasar = (float) $barang->nilai_perolehan;
            $tanggalStart = new \DateTime($barang->tanggal_perolehan);
            $DEFAULT_LIFE_SPAN_YEARS = 5; 
            $assetLifeSpanYears = $barang->kategori->masa_manfaat_tahun ?? $DEFAULT_LIFE_SPAN_YEARS;
            $isRevaluated = false;
            
            $surplusDeficit = 0;
            $nbvSaatReval = 0;
        }

        // --- 4. HITUNG DEPRESIASI (CORE LOGIC) ---
        $lifeSpanDays = 365 * $assetLifeSpanYears;
        
        // Hitung selisih hari dari Start Point (Bisa Tgl Beli atau Tgl Revaluasi)
        $interval = $tanggalStart->diff($targetDate);
        $daysElapsed = $interval->invert ? 0 : $interval->days; // Guard tanggal mundur
        
        // Guard: Jangan melebihi umur manfaat
        $daysForCalc = ($lifeSpanDays > 0) ? min($daysElapsed, $lifeSpanDays) : 0;

        // Hitung Beban
        $dailyDepreciation = ($lifeSpanDays > 0) ? ($hargaDasar / $lifeSpanDays) : 0;
        $accumulatedDepreciation = $dailyDepreciation * $daysForCalc;
        $nbv = max(0, $hargaDasar - $accumulatedDepreciation);

        // --- 5. HITUNG UMUR FISIK (KRONOLOGIS) ---
        // Ini selalu dihitung dari TANGGAL BELI ASLI untuk info Tab Informasi
        $tanggalBeliAsli = new \DateTime($barang->tanggal_perolehan);
        $umurFisikDays = $tanggalBeliAsli->diff($targetDate)->days;
        if ($tanggalBeliAsli > $targetDate) $umurFisikDays = 0;

        // Sisa Umur (Ekonomis)
        $sisaUmurDays = max(0, $lifeSpanDays - $daysForCalc);
        $sisaUmurTahun = round($sisaUmurDays / 365, 2);

        // --- 6. POPULASI DATA KE OBJECT RESPONSE ---
        $barang->umur_hari = $daysElapsed; // Umur sejak titik perhitungan terakhir
        $barang->umur_fisik_hari = $umurFisikDays; // Umur total sejak lahir
        $barang->depresiasi_per_hari = round($dailyDepreciation, 2);
        
        // Data Keuangan
        if ($isRevaluated) {
            // Jika revaluasi, tampilkan akumulasi sejak reset + akumulasi lama (jika disimpan)
            $barang->akumulasi_depresiasi_current = round($accumulatedDepreciation, 2);
            $barang->nilai_dasar_perhitungan = $hargaDasar; // Nilai Revaluasi (88 Juta)
            $barang->surplus_deficit = $surplusDeficit;
            $barang->nbv_sebelum_revaluasi = $nbvSaatReval;
        } else {
            $barang->akumulasi_depresiasi = round($accumulatedDepreciation, 2);
        }
        
        $barang->nilai_nbv = round($nbv, 2);
        
        // Info Flagging
        $barang->is_revaluated = $isRevaluated;
        $barang->tgl_revaluasi = $latestReval ? $latestReval->tanggal_revaluasi : null;
        $barang->sisa_umur_tahun = $sisaUmurTahun;
        $barang->total_umur_ekonomis = $assetLifeSpanYears;

        // Status Text
        if ($nbv <= 0) {
            $barang->status_umur = "Nilai Habis (Rp 0)";
        } else {
            $barang->status_umur = $isRevaluated 
                ? "Masa Manfaat Pasca-Revaluasi" 
                : "Masa Manfaat Normal";
        }

        // --- LOGIKA DECISION ANALYSIS (TETAP SAMA) ---
        $cumulativeCost = $barang->pemeliharaan->where('status_pemeliharaan', 'selesai')->sum('biaya');
        $serviceCountYearly = $barang->pemeliharaan()
            ->where('tanggal', '>=', now()->subYear())
            ->count();
        $currentAge = Carbon::parse($barang->tanggal_perolehan)->diffInYears(now());
        $hasBackup = Barang::where('id_kategori', $barang->id_kategori)
            ->where('status', 'tersedia')
            ->where('id_barang', '!=', $id)
            ->exists();

        $barang->decision_data = [
            'purchasePrice' => (float)$barang->nilai_perolehan, // Tetap harga beli asli
            'cumulativeCost' => (float)$cumulativeCost,
            'serviceCountYearly' => $serviceCountYearly,
            'currentAge' => $currentAge,
            'usefulLife' => (int)$assetLifeSpanYears,
            'hasBackup' => $hasBackup
        ];

        return response()->json([
            'status' => 'success',
            'data' => $barang
        ], 200);
    }

    // Mengupdate data barang
    public function update(Request $request, $id)
    {
        $barang = Barang::find($id);

        if (!$barang) {
            return response()->json([
                'status' => 'error',
                'message' => 'Barang tidak ditemukan'
            ], 404);
        }

        $validated = $request->validate([
            'kode_barang' => 'sometimes|required|unique:barang,kode_barang,' . $id . ',id_barang',
            'nama_barang' => 'sometimes|required|string|max:255',
            'id_kategori' => 'sometimes|required|exists:kategori,id_kategori',
            'merk' => 'sometimes|required|string|max:255',
            'tanggal_perolehan' => 'sometimes|required|date',
            'nilai_perolehan' => 'sometimes|required|numeric',
            'kondisi' => 'sometimes|required|in:baik,rusak ringan,rusak berat',
            'status' => 'sometimes|required|in:tersedia,dipinjam,diperbaiki,dihapus',
            'id_lokasi' => 'sometimes|required|exists:lokasi,id_lokasi',
            'id_penanggungjawab' => 'sometimes|required|exists:penanggungjawab,id_penanggungjawab',
            'qr_code_path' => 'nullable|string|max:255',
        ]);

        $barang->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Barang berhasil diperbarui',
            'data' => $barang
        ], 200);
    }

    // Menghapus barang
    public function destroy($id)
    {
        $barang = Barang::find($id);

        if (!$barang) {
            return response()->json([
                'status' => 'error',
                'message' => 'Barang tidak ditemukan'
            ], 404);
        }

        $barang->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Barang berhasil dihapus'
        ], 200);
    }

    public function summary()
    {
        return response()->json([
            'total_aset_barang' => Barang::where('status', '!=', 'dihapus')->count(),
            'total_nilai_aset' => Barang::where('status', '!=', 'dihapus')->sum('nilai_perolehan'),
            'barang_dihapus' => Barang::where('status', 'dihapus')->count(),
            'barang_servis' => Barang::where('status', 'diperbaiki')->count(),
        ]);
    }
    
    // --- FUNGSI GRAFIK DASHBOARD ---

    public function getMonthlyAcquisition(Request $request)
    {
        $year = $request->get('year', Carbon::now()->year); 
        
        $acquired_items = Barang::whereNotNull('tanggal_perolehan')
                                 ->whereYear('tanggal_perolehan', $year) 
                                 ->orderBy('tanggal_perolehan', 'asc')
                                 ->get();

        $grouped_costs = $acquired_items->groupBy(function($item) {
            return Carbon::parse($item->tanggal_perolehan)->format('n'); 
        });
        
        $MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        $monthly_costs = [];

        for ($i = 1; $i <= 12; $i++) {
            $label = $MONTH_LABELS[$i - 1]; 
            $total_cost = 0.0;

            if ($grouped_costs->has($i)) {
                $total_cost = $grouped_costs->get($i)->sum('nilai_perolehan'); 
            }
            $monthly_costs[$label] = (float)$total_cost;
        }

        $formatted_output = collect($monthly_costs)->map(function ($cost, $label) {
            return [
                'month_year' => $label, 
                'total_cost' => $cost,
            ];
        })->values();

        return response()->json([
            'status' => 'success',
            'data' => $formatted_output
        ], 200);
    }

    // Helper untuk menghitung NBV pada tanggal tertentu
    private function calculateNBVAtDate($asset, $targetDate)
    {
        $DEFAULT_LIFE_SPAN_YEARS = 5; 
        
        $hargaBeli = (float) $asset->nilai_perolehan;
        $tanggalPerolehan = new \DateTime($asset->tanggal_perolehan);
        $assetLifeSpanYears = $asset->kategori->masa_manfaat_tahun ?? $DEFAULT_LIFE_SPAN_YEARS;

        if ($hargaBeli <= 0 || $assetLifeSpanYears <= 0) {
            return 0;
        }
        
        // KRUSIAL: Jika aset belum diakuisisi pada tanggal target, NBV adalah 0.
        if ($tanggalPerolehan > $targetDate) {
            return 0; 
        }

        $LIFE_SPAN_DAYS = 365 * $assetLifeSpanYears; 
        
        $timeDiff = $targetDate->getTimestamp() - $tanggalPerolehan->getTimestamp();
        $daysElapsed = floor($timeDiff / (60 * 60 * 24)); 

        $depreciableBase = $hargaBeli; // Nilai residu = 0

        if ($daysElapsed >= $LIFE_SPAN_DAYS) {
            return 0; 
        }

        $dailyDepreciation = $depreciableBase / $LIFE_SPAN_DAYS;
        $accumulatedDepreciation = $dailyDepreciation * $daysElapsed;
        
        $netBookValue = $hargaBeli - $accumulatedDepreciation;

        return max($netBookValue, 0);
    }
    
    public function getMonthlyNBV(Request $request)
    {
        $year = $request->query('year', date('Y'));
        
        $activeAssets = Barang::where('status', '!=', 'dihapus')
                             ->where('tanggal_perolehan', '<=', "{$year}-12-31") 
                             ->with('kategori')
                             ->get();

        $monthlyNBV = array_fill(0, 12, 0); 
        $MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        for ($monthIndex = 0; $monthIndex < 12; $monthIndex++) {
            $month = $monthIndex + 1;
            
            $targetDate = \DateTime::createFromFormat('Y-n-j', "{$year}-{$month}-" . cal_days_in_month(CAL_GREGORIAN, $month, $year));
            
            $totalNBVThisMonth = 0;

            foreach ($activeAssets as $asset) {
                $nbv = $this->calculateNBVAtDate($asset, $targetDate);
                $totalNBVThisMonth += $nbv;
            }

            $monthlyNBV[$monthIndex] = round($totalNBVThisMonth, 2); 
        }
        
        $result = [];
        foreach ($monthlyNBV as $index => $value) {
            $result[] = [
                'month_year' => $MONTH_LABELS[$index],
                'total_nbv' => $value 
            ];
        }

        return response()->json(['data' => $result]);
    }

    public function getMonthlyDepreciation(Request $request)
    {
        $year = $request->query('year', date('Y'));
        
        $activeAssets = Barang::where('status', '!=', 'dihapus')
                              ->with('kategori')
                              ->get();

        $monthlyDepreciation = array_fill(0, 12, 0); 
        $DEFAULT_LIFE_SPAN_YEARS = 5; 

        foreach ($activeAssets as $asset) {
            $hargaBeli = (float) $asset->nilai_perolehan;
            $tanggalPerolehan = new \DateTime($asset->tanggal_perolehan);
            $assetLifeSpanYears = $asset->kategori->masa_manfaat_tahun ?? $DEFAULT_LIFE_SPAN_YEARS;

            if ($hargaBeli <= 0 || $assetLifeSpanYears <= 0) continue;

            $yearlyDepreciation = $hargaBeli / $assetLifeSpanYears;
            $monthlyDepreciationExpense = $yearlyDepreciation / 12;

            for ($month = 1; $month <= 12; $month++) {
                $currentMonth = \DateTime::createFromFormat('Y-n-d', "{$year}-{$month}-01");
                
                if ($tanggalPerolehan <= $currentMonth) {
                    if ($currentMonth->format('Y') == $year) {
                        $monthlyDepreciation[$month - 1] += $monthlyDepreciationExpense;
                    }
                }
            }
        }
        
        $MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        $result = [];
        foreach ($monthlyDepreciation as $index => $cost) {
            $result[] = [
                'month_year' => $MONTH_LABELS[$index],
                'total_depreciation_cost' => round($cost, 2) 
            ];
        }

        return response()->json(['data' => $result]);
    }

    // File: app/Http/Controllers/BarangController.php
    public function getLogs($id)
    {
        // Cari log berdasarkan id_barang
        $logs = \App\Models\LogBarang::where('id_barang', $id)
                    ->orderBy('created_at', 'desc')
                    ->get();

        // Jika data kosong, tetap kembalikan array kosong (bukan 404)
        return response()->json([
            'status' => 'success',
            'data' => $logs
        ], 200);
    }

    // --- TAMBAHKAN INI DI BAGIAN BAWAH CONTROLLER ---
    
    public function summaryStats()
    {
        // Cache hasilnya selama 60 menit (3600 detik).
        // Jadi perhitungan berat cuma jalan 1x per jam.
        $stats = \Illuminate\Support\Facades\Cache::remember('dashboard_stats', 3600, function () {
            
            // Ambil semua aset aktif
            $activeAssets = Barang::where('status', '!=', 'dihapus')->get();
            
            // Hitung Total NBV secara manual di sini (Server Side Calculation)
            $totalNBV = 0;
            $DEFAULT_LIFE_SPAN_YEARS = 5;
            $now = new \DateTime();

            foreach ($activeAssets as $asset) {
                $harga = (float) $asset->nilai_perolehan;
                $tgl = new \DateTime($asset->tanggal_perolehan);
                $masa = $asset->kategori->masa_manfaat_tahun ?? $DEFAULT_LIFE_SPAN_YEARS;
                
                // Logika hitung NBV per item
                $lifeSpanDays = 365 * $masa;
                $daysElapsed = floor(($now->getTimestamp() - $tgl->getTimestamp()) / (60 * 60 * 24));
                
                if ($daysElapsed >= $lifeSpanDays) {
                    $nbv = 0;
                } else {
                    $dailyDep = $harga / $lifeSpanDays;
                    $nbv = max(0, $harga - ($dailyDep * $daysElapsed));
                }
                $totalNBV += $nbv;
            }

            return [
                'total_assets' => Barang::count(),
                'active_assets' => Barang::where('status', 'tersedia')->count(),
                'deleted_assets' => Barang::where('status', 'dihapus')->count(),
                'repaired_assets' => Barang::where('status', 'diperbaiki')->count(),
                'total_acquisition' => Barang::where('status', '!=', 'dihapus')->sum('nilai_perolehan'),
                'total_nbv' => round($totalNBV, 2),
            ];
        });

        return response()->json(['data' => $stats]);
    }

    public function downloadQr($id)
    {
        $barang = Barang::findOrFail($id);
        $kodeBarang = $barang->kode_barang;
        $namaBarang = $barang->nama_barang;

        // 1. Generate QR Code dasar (Size 300)
        $qrRaw = QrCode::format('png')->size(300)->margin(2)->generate($kodeBarang);
        $qrImage = imagecreatefromstring($qrRaw);

        // 2. Buat Kanvas Putih (Lebar 300, Tinggi 400 agar ada ruang teks di bawah)
        $canvas = imagecreatetruecolor(300, 400);
        $white = imagecolorallocate($canvas, 255, 255, 255);
        $black = imagecolorallocate($canvas, 0, 0, 0);
        imagefill($canvas, 0, 0, $white);

        // 3. Tempelkan QR Code ke Kanvas (di posisi atas)
        imagecopy($canvas, $qrImage, 0, 0, 0, 0, 300, 300);

        // 4. Tambahkan Teks (Kode & Nama Barang)
        // Font 5 adalah font built-in terbesar di PHP GD
        $textMarginLeft = 20;
        imagestring($canvas, 5, $textMarginLeft, 310, "KODE: " . $kodeBarang, $black);
        
        // Potong nama barang jika terlalu panjang agar tidak keluar garis
        $shortName = substr($namaBarang, 0, 30); 
        imagestring($canvas, 3, $textMarginLeft, 340, "NAMA: " . $shortName, $black);

        // 5. Return sebagai Stream Download agar tidak membebani server
        $fileName = "QR_" . $kodeBarang . ".png";

        return response()->streamDownload(function () use ($canvas) {
            imagepng($canvas);
            imagedestroy($canvas);
        }, $fileName, ['Content-Type' => 'image/png']);
    }

}