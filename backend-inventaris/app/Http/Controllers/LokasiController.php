<?php

namespace App\Http\Controllers;

use App\Models\Lokasi;
use App\Models\Barang; // WAJIB: Import Model Barang
use Illuminate\Http\Request;

class LokasiController extends Controller
{
    /**
     * Menampilkan semua lokasi (dengan jumlah barang terkait).
     */
    public function index()
    {
        // Menggunakan withCount('barang') untuk mendapatkan jumlah aset
        $lokasi = Lokasi::withCount('barang')->get();
        
        return response()->json([
            'status' => 'success',
            'data' => $lokasi
        ], 200);
    }
    
    // ----------------------------------------------------------------------------------
    
    /**
     * Menampilkan daftar barang yang terkait dengan lokasi tertentu. (ENDPOINT BARU)
     */
    public function getBarangByLokasi(Request $request, $id)
    {
        // Ambil parameter halaman dari request (misalnya ?page=2)
        $perPage = $request->get('per_page', 10); // Default 10 item per halaman

        // Cari lokasi
        $lokasi = Lokasi::find($id);

        if (!$lokasi) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lokasi tidak ditemukan'
            ], 404);
        }

        // Ambil semua barang yang memiliki id_lokasi ini, 
        // dengan eager loading relasi 'kategori'.
        // Menggunakan paginate() untuk mendukung Server-Side Pagination.
        $barangTerkait = Barang::where('id_lokasi', $id)
                                ->with(['kategori']) 
                                ->paginate($perPage);

        // Laravel's paginate() otomatis mengembalikan objek paginasi (data, total, current_page, dll.)
        return response()->json([
            'status' => 'success',
            'message' => 'Daftar barang berhasil dimuat',
            'data' => $barangTerkait 
        ], 200);
    }
    
    // ----------------------------------------------------------------------------------

    /**
     * Menyimpan lokasi baru
     */
    public function store(Request $request)
    {
        $request->validate([
            // Tambahkan unique validation jika nama_lokasi harus unik
            'nama_lokasi' => 'required|string|max:255|unique:lokasi,nama_lokasi' 
        ]);

        $lokasi = Lokasi::create([
            'nama_lokasi' => $request->nama_lokasi
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Lokasi berhasil ditambahkan',
            'data' => $lokasi
        ], 201);
    }

    /**
     * Menampilkan detail satu lokasi
     */
    public function show($id)
    {
        $lokasi = Lokasi::find($id);

        if (!$lokasi) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lokasi tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $lokasi
        ], 200);
    }

    /**
     * Mengupdate lokasi
     */
    public function update(Request $request, $id)
    {
        $lokasi = Lokasi::find($id);

        if (!$lokasi) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lokasi tidak ditemukan'
            ], 404);
        }

        $request->validate([
            // Tambahkan unique validation, abaikan ID lokasi saat ini
            'nama_lokasi' => 'required|string|max:255|unique:lokasi,nama_lokasi,' . $id . ',id_lokasi'
        ]);

        $lokasi->update([
            'nama_lokasi' => $request->nama_lokasi
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Lokasi berhasil diperbarui',
            'data' => $lokasi
        ], 200);
    }

    /**
     * Menghapus lokasi
     */
    public function destroy($id)
    {
        try {
            $lokasi = Lokasi::findOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lokasi tidak ditemukan'
            ], 404);
        }

        // Coba hapus
        try {
            $lokasi->delete();
            return response()->json([
                'status' => 'success',
                'message' => 'Lokasi berhasil dihapus'
            ], 200);
        } catch (\Illuminate\Database\QueryException $e) {
            // Tangkap Foreign Key Constraint Violation (jika ada barang terkait)
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus lokasi. Pastikan tidak ada barang yang berada di lokasi ini.'
            ], 409); // 409 Conflict
        }
    }
}