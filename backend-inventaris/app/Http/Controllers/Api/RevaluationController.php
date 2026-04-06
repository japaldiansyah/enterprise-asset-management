<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Barang;
use App\Models\AssetRevaluation;
use Carbon\Carbon;

class RevaluationController extends Controller
{
    public function store(Request $request, $id)
    {
        // 1. Validasi Input User
        $request->validate([
            'tanggal_revaluasi' => 'required|date',
            'nilai_baru'        => 'required|numeric|min:0', // Nilai Pasar (88 Juta)
            'sisa_umur_tahun'   => 'required|integer|min:1', // Estimasi Umur Baru (8 Tahun)
            'keterangan'        => 'nullable|string'
        ]);

        $barang = Barang::find($id);
        if (!$barang) return response()->json(['message' => 'Barang tidak ditemukan'], 404);

        // 2. HITUNG NBV SAAT INI (SNAPSHOT SEBELUM REVALUASI)
        // Kita perlu tahu posisi nilai buku tepat pada tanggal revaluasi
        $nbvSystem = $this->calculateNBVSnapshot($barang, $request->tanggal_revaluasi);

        // 3. HITUNG SURPLUS / DEFISIT
        // Rumus: Nilai Baru - Nilai Buku Lama
        $nilaiBaru = $request->input('nilai_baru');
        $surplus = $nilaiBaru - $nbvSystem;

        // 4. SIMPAN KE DATABASE (Metode Eliminasi)
        // Kita simpan snapshot NBV lama & Surplusnya untuk audit
        $reval = AssetRevaluation::create([
            'barang_id'         => $id,
            'tanggal_revaluasi' => $request->tanggal_revaluasi,
            'nilai_baru'        => $nilaiBaru,
            'sisa_umur_baru'    => $request->sisa_umur_tahun, // Perhatikan nama kolom di migration Anda
            'nbv_saat_ini'      => $nbvSystem,
            'surplus_deficit'   => $surplus,
            'keterangan'        => $request->keterangan
        ]);

        return response()->json([
            'message' => 'Revaluasi berhasil disimpan',
            'surplus' => $surplus, // Kirim balik info surplus ke frontend
            'data'    => $reval
        ], 201);
    }

    // --- HELPER FUNCTION UNTUK MENGHITUNG NBV ---
    private function calculateNBVSnapshot($barang, $targetDateStr)
    {
        // Logika ini MIRIP dengan yang ada di BarangController,
        // tapi kita paksa target date-nya adalah tanggal revaluasi.
        
        $targetDate = new \DateTime($targetDateStr);
        
        // Cek apakah ada revaluasi SEBELUM tanggal ini? (Untuk kasus revaluasi bertingkat)
        // Ambil revaluasi terakhir yang tanggalnya LEBIH KECIL dari target date
        $prevReval = $barang->revaluations()
                            ->where('tanggal_revaluasi', '<', $targetDateStr)
                            ->orderBy('tanggal_revaluasi', 'desc')
                            ->first();

        if ($prevReval) {
            // Basis perhitungan dari revaluasi sebelumnya
            $hargaDasar = (float) $prevReval->nilai_baru;
            $tanggalStart = new \DateTime($prevReval->tanggal_revaluasi);
            $lifeSpanYears = (int) $prevReval->sisa_umur_baru;
        } else {
            // Basis perhitungan normal (Historical Cost)
            $hargaDasar = (float) $barang->nilai_perolehan;
            $tanggalStart = new \DateTime($barang->tanggal_perolehan);
            $lifeSpanYears = $barang->kategori->masa_manfaat_tahun ?? 5;
        }

        // Hitung Depresiasi
        $lifeSpanDays = 365 * $lifeSpanYears;
        
        // Hitung selisih hari dari Start s/d Tanggal Revaluasi Baru
        $interval = $tanggalStart->diff($targetDate);
        $daysElapsed = $interval->invert ? 0 : $interval->days; // Guard tanggal mundur
        
        $daysForCalc = ($lifeSpanDays > 0) ? min($daysElapsed, $lifeSpanDays) : 0;
        
        $dailyDep = ($lifeSpanDays > 0) ? ($hargaDasar / $lifeSpanDays) : 0;
        $accumulated = $dailyDep * $daysForCalc;
        
        $nbv = max(0, $hargaDasar - $accumulated);
        
        return round($nbv, 2);
    }
}