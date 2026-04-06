<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\LaporanKerusakan;
use App\Models\Barang;
use Illuminate\Support\Facades\DB;

class LaporanKerusakanController extends Controller
{
    public function store(Request $request)
    {
        // 1. Validasi input
        $request->validate([
            'id_barang' => 'required|exists:barang,id_barang',
            'id_penanggungjawab' => 'required|exists:penanggungjawab,id_penanggungjawab', // Validasi PJ
            'deskripsi' => 'required|string',
            'tingkat' => 'required|in:rusak ringan,rusak berat',
        ]);

        try {
            DB::beginTransaction();

            // 2. Cari data barang untuk mendapatkan id_penanggungjawab
            $barang = Barang::findOrFail($request->id_barang);

            // 3. Simpan data ke tabel laporan_kerusakan
            LaporanKerusakan::create([
                'id_barang' => $request->id_barang,
                'id_penanggungjawab' => $barang->id_penanggungjawab, // Otomatis dari penanggungjawab barang
                'tanggal_lapor' => now(),
                'deskripsi' => $request->deskripsi,
                'tingkat' => $request->tingkat,
            ]);

            // 4. Update kondisi di tabel barang utama
            $barang->update([
                'kondisi' => $request->tingkat
            ]);

            $barang = Barang::findOrFail($request->id_barang);

            // Panggil fungsi log
            $barang->addLog('Laporan Kerusakan', "Kondisi {$request->tingkat}. Ket: {$request->deskripsi}");

            DB::commit();   

            return response()->json([
                'status' => 'success',
                'message' => 'Laporan kerusakan berhasil disimpan dan kondisi barang diperbarui.'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }
}