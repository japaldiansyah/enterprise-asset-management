<?php

namespace App\Http\Controllers;

use App\Models\Pemeliharaan;
use Illuminate\Http\Request;
use App\Models\Barang;
use Carbon\Carbon; // <<< WAJIB DITAMBAHKAN UNTUK LOGIKA GROUPING

class PemeliharaanController extends Controller
{
    /**
     * Menampilkan semua data pemeliharaan, dengan opsi filter status.
     */
    public function index(Request $request)
    {
        $query = Pemeliharaan::with('barang');
        $limit = $request->get('limit');

        // Logika 1: FILTER STATUS PEMELIHARAAN (untuk daftar "belum selesai")
        if ($request->has('status_pemeliharaan')) {
            $status = $request->status_pemeliharaan;
            if ($status === 'belum_selesai') {
                // Tampilkan semua yang BUKAN 'selesai' (misal: 'proses', 'menunggu_sparepart', dll)
                $query->where('status_pemeliharaan', '!=', 'selesai');
            } else {
                // Filter berdasarkan status spesifik lainnya
                $query->where('status_pemeliharaan', $status);
            }
        }
        // Tambahkan limit jika ada
        if ($limit) {
            $query->limit($limit);
        }
        // Urutkan berdasarkan tanggal (terbaru dulu)
        $data = $query->orderBy('tanggal', 'desc')->get();
        return response()->json([
            'status' => 'success',
            'data' => $data
        ], 200);
    }
    /**

     * Menyimpan pemeliharaan baru

     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'id_barang' => 'required|exists:barang,id_barang',
            'jenis_perbaikan' => 'required|string|max:255',
            'vendor' => 'required|string|max:255',
            'biaya' => 'required|numeric',
            'tanggal' => 'required|date',
            'keterangan' => 'nullable|string'
        ]);
        // 1. Tambahkan status_pemeliharaan ke data yang akan disimpan
        $validatedData['status_pemeliharaan'] = 'proses'; // Status default
        // 2. Simpan Pemeliharaan
        $pemeliharaan = Pemeliharaan::create($validatedData);
        // 3. Update Status Aset (Barang)
        $barang = Barang::find($request->id_barang);
        if ($barang) {
            $barang->status = 'diperbaiki'; // Ubah status aset menjadi 'diperbaiki'
            $barang->save();
        }
        $barang->addLog('Pemeliharaan', "Barang diperbaiki oleh vendor {$request->vendor}");

        return response()->json([
            'status' => 'success',
            'message' => 'Data pemeliharaan berhasil ditambahkan dan status aset diperbarui',
            'data' => $pemeliharaan
        ], 201);
    }
    /**
     * Menampilkan detail pemeliharaan
     */
    public function show($id)
    {
        $pemeliharaan = Pemeliharaan::with('barang')->find($id);
        if (!$pemeliharaan) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data pemeliharaan tidak ditemukan'
            ], 404);
        }
        return response()->json([
            'status' => 'success',
            'data' => $pemeliharaan
        ], 200);
    }
    /**
     * Update data pemeliharaan
     */
    public function update(Request $request, $id)
    {
        $pemeliharaan = Pemeliharaan::find($id);
        if (!$pemeliharaan) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data pemeliharaan tidak ditemukan'
            ], 404);
        }
        $request->validate([
            'id_barang' => 'sometimes|exists:barang,id_barang',
            'jenis_perbaikan' => 'sometimes|string|max:255',
            'vendor' => 'sometimes|string|max:255',
            'biaya' => 'sometimes|numeric',
            'tanggal' => 'sometimes|date',
            'keterangan' => 'nullable|string'
        ]);
        $pemeliharaan->update($request->all());
        return response()->json([
            'status' => 'success',
            'message' => 'Data pemeliharaan berhasil diperbarui',
            'data' => $pemeliharaan
        ], 200);
    }
    /**
     * Menghapus data pemeliharaan
     */
    public function destroy($id)
    {
        $pemeliharaan = Pemeliharaan::find($id);
        if (!$pemeliharaan) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data pemeliharaan tidak ditemukan'
            ], 404);
        }
        $pemeliharaan->delete();
        return response()->json([
            'status' => 'success',
            'message' => 'Data pemeliharaan berhasil dihapus'
        ], 200);
    }
    /**
     * Menandai pemeliharaan selesai dan memperbarui status serta kondisi barang.
     */
    public function markAsDone($id)
    {
        // 1. Cari Record Pemeliharaan
        $pemeliharaan = Pemeliharaan::find($id);

        if (!$pemeliharaan) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data pemeliharaan tidak ditemukan'
            ], 404);
        }

        // 2. Update Status Pemeliharaan menjadi Selesai
        $pemeliharaan->update([
            'status_pemeliharaan' => 'selesai',
            'tanggal_selesai' => now()->toDateString(), // Mencatat tanggal selesai hari ini
        ]);

        $id_barang = $pemeliharaan->id_barang;

        // 3. Cek Konflik: Apakah ada perbaikan lain untuk barang ini yang statusnya masih 'proses'?
        // Ini untuk mencegah barang menjadi 'tersedia' padahal masih ada perbaikan lain yang belum kelar.
        $hasOtherActiveService = Pemeliharaan::where('id_barang', $id_barang)
                                             ->where('status_pemeliharaan', 'proses')
                                             ->where('id_pemeliharaan', '!=', $id) // Kecualikan data yang baru saja diupdate
                                             ->exists();

        // 4. Update Status dan Kondisi Aset (Barang)
        if (!$hasOtherActiveService) {
            $barang = Barang::find($id_barang);
            
            if ($barang) {
                // Logika Status: Ubah dari 'diperbaiki' kembali ke 'tersedia'
                $barang->status = 'tersedia';

                // Logika Kondisi: Jika sebelumnya rusak (ringan/berat), ubah otomatis menjadi 'baik'
                // Kita gunakan strtolower untuk menghindari kesalahan case-sensitive
                $kondisiLama = strtolower($barang->kondisi);
                if ($kondisiLama === 'rusak ringan' || $kondisiLama === 'rusak berat') {
                    $barang->kondisi = 'baik';
                }

                $barang->save();
            }
        }

        // 5. Berikan Respon
        return response()->json([
            'status' => 'success',
            'message' => 'Pemeliharaan berhasil diselesaikan. Status barang kembali tersedia dan kondisi diperbarui.',
            'data' => [
                'pemeliharaan' => $pemeliharaan,
                'barang' => $barang ?? null
            ]
        ], 200);
    }
    /**
     * FUNGSI BARU: Mengagregasi total biaya pemeliharaan yang sudah selesai, dikelompokkan per bulan.
     * Digunakan untuk Chart.js di React.
     */
    public function getMonthlyServiceCost(Request $request) // <<< Menerima $request
    {
        // 1. Ambil Tahun dari Request, default ke tahun sekarang (e.g., 2025)
        $year = $request->get('year', Carbon::now()->year); 
        
        // 2. Query data, FILTER berdasarkan TAHUN
        $finished_maintenance = Pemeliharaan::where('status_pemeliharaan', 'selesai')
                                         // Filter TANGGAL antara 1 Jan s/d 31 Des TAHUN yang diminta
                                         ->whereYear('tanggal', $year) // <<< FILTER TAHUN BARU
                                         ->orderBy('tanggal', 'asc')
                                         ->get();

        // 3. Kelompokkan berdasarkan Bulan (Nomor Bulan untuk grouping yang akurat)
        $grouped_costs = $finished_maintenance->groupBy(function($item) {
            // Kunci grouping: Nomor Bulan (e.g., '11' untuk November)
            return Carbon::parse($item->tanggal)->format('n'); // 'n' adalah nomor bulan tanpa leading zero
        });
        
        // 4. Siapkan Array Biaya 12 Bulan (Map)
        // Array asosiatif untuk menyimpan biaya total (key: Nama Bulan Singkat)
        $monthly_costs = [];
        $MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        // Inisialisasi semua bulan dengan total_cost = 0
        foreach ($MONTH_LABELS as $label) {
            $monthly_costs[$label] = 0.0;
        }

        // 5. Isi Array dengan data yang dihitung
        for ($i = 1; $i <= 12; $i++) {
            if ($grouped_costs->has($i)) {
                $items_in_month = $grouped_costs->get($i);
                $total_cost = $items_in_month->sum('biaya');
                
                // Gunakan label bulan yang sesuai dari array MONTH_LABELS (index i-1)
                $label = $MONTH_LABELS[$i - 1]; 
                
                $monthly_costs[$label] = (float)$total_cost;
            }
        }

        // 6. Konversi ke array list (values) untuk React, dan format output
        $formatted_output = collect($monthly_costs)->map(function ($cost, $label) {
            return [
                // Mengembalikan hanya nama bulan (e.g., 'Jan')
                'month_year' => $label, 
                'total_cost' => $cost, 
            ];
        })->values();


        return response()->json([
            'status' => 'success',
            'data' => $formatted_output
        ], 200);
    }
}