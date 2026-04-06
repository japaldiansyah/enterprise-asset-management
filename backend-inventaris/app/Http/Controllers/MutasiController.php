<?php

namespace App\Http\Controllers;

use App\Models\Mutasi;
use App\Models\Lokasi;
use App\Models\Barang; // [1] Import model Barang
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; // [2] Import DB untuk Transaction

class MutasiController extends Controller
{
    /**
     * Menampilkan semua data mutasi.
     */
    public function index()
    {
        $data = Mutasi::with('barang')->get();

        return response()->json([
            'status' => 'success',
            'data' => $data
        ], 200);
    }

    /**
     * Menyimpan data mutasi baru dan otomatis memperbarui lokasi barang.
     * INI ADALAH METHOD YANG DIREVISI.
     */
    public function store(Request $request)
    {
        // 1. Validasi input
        $validated = $request->validate([
            'id_barang' => 'required|exists:barang,id_barang',
            'lokasi_awal' => 'required|exists:lokasi,id_lokasi', 
            'lokasi_tujuan' => 'required|exists:lokasi,id_lokasi', // Lokasi Baru
            'tanggal_mutasi' => 'required|date',
            'penanggungjawab_baru' => 'required|exists:penanggungjawab,id_penanggungjawab', // PJ Baru
        ]);

        // 2. Mulai Database Transaction untuk menjamin konsistensi
        try {
            DB::beginTransaction();

            // A. Mencatat Mutasi Baru ke Tabel Mutasi
            $mutasi = Mutasi::create($validated);

            // B. MEMPERBARUI (UPDATE) DATA BARANG TERKAIT di Tabel Barang
            
            // 2.1 Ambil model Barang berdasarkan ID
            $barang = Barang::find($validated['id_barang']);

            $namaLokasiAwal = $barang->lokasi ? $barang->lokasi->nama_lokasi : 'Lokasi Awal Tidak Diketahui';

            $lokasiTujuan = Lokasi::find($validated['lokasi_tujuan']);
            $namaLokasiTujuan = $lokasiTujuan ? $lokasiTujuan->nama_lokasi : 'Lokasi Tujuan Tidak Ditemukan';

            if (!$barang) {
                DB::rollBack();
                return response()->json(['status' => 'error', 'message' => 'Barang tidak ditemukan'], 404);
            }

            // 2.2 Lakukan pembaruan (UPDATE) lokasi dan penanggung jawab
            $barang->update([
                // Ganti Lokasi Barang saat ini dengan Lokasi Tujuan dari mutasi
                'id_lokasi' => $validated['lokasi_tujuan'], 
                
                // Ganti Penanggung Jawab Barang saat ini dengan PJ Baru dari mutasi
                'id_penanggungjawab' => $validated['penanggungjawab_baru'], 
            ]);
        
            $barang->addLog('Mutasi', "Aset dipindahkan dari ruangan {$namaLokasiAwal} ke ruangan {$namaLokasiTujuan}.");

            DB::commit(); // Konfirmasi semua perubahan (Mutasi dan Update Barang)

            return response()->json([
                'status' => 'success',
                'message' => 'Mutasi berhasil dicatat, dan Lokasi Barang berhasil diperbarui.',
                'data' => $mutasi
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack(); // Batalkan jika ada error
            \Log::error('Gagal melakukan mutasi dan update barang: ' . $e->getMessage()); 
            
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal dalam proses mutasi. ' . $e->getMessage()
            ], 500);
        }
    }
    
    // ... Method show, update, destroy lainnya tetap sama ... 
    public function show($id)
    {
        $mutasi = Mutasi::with('barang')->find($id);

        if (!$mutasi) {
            return response()->json([
                'status' => 'error',
                'message' => 'Mutasi tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $mutasi
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $mutasi = Mutasi::find($id);

        if (!$mutasi) {
            return response()->json([
                'status' => 'error',
                'message' => 'Mutasi tidak ditemukan'
            ], 404);
        }

        $validated = $request->validate([
            'id_barang' => 'sometimes|exists:barang,id_barang',
            'lokasi_awal' => 'sometimes|exists:lokasi,id_lokasi',
            'lokasi_tujuan' => 'sometimes|exists:lokasi,id_lokasi',
            'tanggal_mutasi' => 'sometimes|date',
            'penanggungjawab_baru' => 'sometimes|exists:penanggungjawab,id_penanggungjawab',
        ]);

        $mutasi->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Mutasi berhasil diperbarui',
            'data' => $mutasi
        ], 200);
    }

    public function destroy($id)
    {
        $mutasi = Mutasi::find($id);

        if (!$mutasi) {
            return response()->json([
                'status' => 'error',
                'message' => 'Mutasi tidak ditemukan'
            ], 404);
        }

        $mutasi->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Mutasi berhasil dihapus'
        ], 200);
    }
}