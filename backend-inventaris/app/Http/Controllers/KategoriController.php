<?php

namespace App\Http\Controllers;

use App\Models\Kategori;
use App\Models\Barang; 
use Illuminate\Http\Request;

class KategoriController extends Controller
{
    /**
     * Menampilkan semua kategori (dengan jumlah barang terkait).
     */
    public function index()
    {
        // Menggunakan withCount('barang') untuk mendapatkan jumlah aset
        $kategori = Kategori::withCount('barang')->get();
        
        // Laravel secara otomatis menyertakan kolom masa_manfaat_tahun
        // jika sudah ditambahkan di Model dan Database.
        
        return response()->json([
            'status' => 'success',
            'data' => $kategori
        ], 200);
    }
    
    // ----------------------------------------------------------------------------------
    
    /**
     * Menampilkan daftar barang yang terkait dengan kategori tertentu. (ENDPOINT DETAIL)
     */
    public function getBarangByKategori(Request $request, $id)
    {
        $perPage = $request->get('per_page', 10); 

        $kategori = Kategori::find($id);

        if (!$kategori) {
            return response()->json([
                'status' => 'error',
                'message' => 'Kategori tidak ditemukan'
            ], 404);
        }

        // Ambil data barang yang terkait dengan relasi (dengan paginasi)
        $barangTerkait = Barang::where('id_kategori', $id)
                                ->with(['lokasi', 'penanggungjawab']) 
                                ->paginate($perPage); 

        return response()->json([
            'status' => 'success',
            'message' => 'Daftar barang berhasil dimuat',
            // Mengembalikan objek paginasi standar Laravel
            'data' => $barangTerkait 
        ], 200);
    }
    
    // ----------------------------------------------------------------------------------

    /**
     * Menyimpan kategori baru
     */
    public function store(Request $request)
    {
        // PERBAIKAN: Validasi masa_manfaat_tahun
        $request->validate([
            'nama_kategori' => 'required|string|max:255|unique:kategori,nama_kategori',
            'masa_manfaat_tahun' => 'required|integer|min:1'
        ]);

        $kategori = Kategori::create([
            'nama_kategori' => $request->nama_kategori,
            'masa_manfaat_tahun' => $request->masa_manfaat_tahun // Simpan nilai baru
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Kategori berhasil ditambahkan',
            'data' => $kategori
        ], 201);
    }

    /**
     * Menampilkan detail satu kategori
     */
    public function show($id)
    {
        $kategori = Kategori::find($id);

        if (!$kategori) {
            return response()->json([
                'status' => 'error',
                'message' => 'Kategori tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $kategori
        ], 200);
    }

    /**
     * Mengupdate kategori
     */
    public function update(Request $request, $id)
    {
        $kategori = Kategori::find($id);

        if (!$kategori) {
            return response()->json([
                'status' => 'error',
                'message' => 'Kategori tidak ditemukan'
            ], 404);
        }

        // PERBAIKAN: Validasi masa_manfaat_tahun
        $request->validate([
            'nama_kategori' => 'required|string|max:255|unique:kategori,nama_kategori,' . $id . ',id_kategori',
            'masa_manfaat_tahun' => 'required|integer|min:1' 
        ]);

        $kategori->update([
            'nama_kategori' => $request->nama_kategori,
            'masa_manfaat_tahun' => $request->masa_manfaat_tahun // Update nilai baru
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Kategori berhasil diperbarui',
            'data' => $kategori
        ], 200);
    }

    /**
     * Menghapus kategori
     */
    public function destroy($id)
    {
        $kategori = Kategori::find($id);

        if (!$kategori) {
            return response()->json([
                'status' => 'error',
                'message' => 'Kategori tidak ditemukan'
            ], 404);
        }

        $kategori->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Kategori berhasil dihapus'
        ], 200);
    }
}