<?php

namespace App\Http\Controllers;

use App\Models\Penanggungjawab;
use App\Models\Barang; // WAJIB: Import Model Barang
use Illuminate\Http\Request;

class PenanggungjawabController extends Controller
{
    /**
     * Menampilkan semua penanggungjawab (dengan jumlah barang terkait).
     */
    public function index()
    {
        // Menggunakan withCount('barang') untuk mendapatkan jumlah aset
        $pjs = Penanggungjawab::withCount('barang')->get();

        return response()->json([
            'status' => 'success',
            'data' => $pjs
        ], 200);
    }
    
    // ----------------------------------------------------------------------------------
    
    /**
     * Menampilkan daftar barang yang terkait dengan penanggung jawab tertentu. (ENDPOINT BARU)
     */
    public function getBarangByPenanggungJawab(Request $request, $id)
    {
        $perPage = $request->get('per_page', 10);

        // Cari Penanggung Jawab
        $pj = Penanggungjawab::find($id);

        if (!$pj) {
            return response()->json([
                'status' => 'error',
                'message' => 'Penanggung Jawab tidak ditemukan'
            ], 404);
        }

        // Ambil semua barang yang menjadi tanggung jawab pegawai ini, 
        // dengan eager loading relasi 'kategori' dan 'lokasi'.
        $barangTerkait = Barang::where('id_penanggungjawab', $id)
                                ->with(['kategori', 'lokasi']) 
                                ->paginate($perPage);

        // Laravel's paginate() otomatis mengembalikan objek paginasi (data, total, current_page, dll.)
        return response()->json([
            'status' => 'success',
            'message' => 'Daftar aset berhasil dimuat',
            'data' => $barangTerkait 
        ], 200);
    }
    
    // ----------------------------------------------------------------------------------

    /**
     * Menyimpan data penanggungjawab baru
     */
    public function store(Request $request)
    {
        $request->validate([
            'nama_pegawai'=> 'required|string|max:255',
            'jabatan'     => 'required|string|max:255',
            'divisi'      => 'required|string|max:255'
        ]);

        $data = Penanggungjawab::create($request->all());

        return response()->json([
            'status'  => 'success',
            'message' => 'Penanggungjawab berhasil ditambahkan',
            'data'    => $data
        ], 201);
    }

    /**
     * Menampilkan detail satu penanggungjawab
     */
    public function show($id)
    {
        $data = Penanggungjawab::find($id);

        if (!$data) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Penanggungjawab tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $data
        ], 200);
    }

    /**
     * Mengupdate data penanggungjawab
     */
    public function update(Request $request, $id)
    {
        $data = Penanggungjawab::find($id);

        if (!$data) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Penanggungjawab tidak ditemukan'
            ], 404);
        }

        $request->validate([
            'nama_pegawai'=> 'sometimes|string|max:255',
            'jabatan'     => 'sometimes|string|max:255',
            'divisi'      => 'sometimes|string|max:255'
        ]);

        $data->update($request->all());

        return response()->json([
            'status'  => 'success',
            'message' => 'Penanggungjawab berhasil diperbarui',
            'data'    => $data
        ], 200);
    }

    /**
     * Menghapus data penanggungjawab (dengan handling Foreign Key)
     */
    public function destroy($id)
    {
        $data = Penanggungjawab::find($id);

        if (!$data) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Penanggungjawab tidak ditemukan'
            ], 404);
        }

        try {
            $data->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Penanggungjawab berhasil dihapus'
            ], 200);
        } catch (\Illuminate\Database\QueryException $e) {
            // Tangkap Foreign Key Constraint Violation
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus penanggung jawab. Masih ada aset yang terikat pada pegawai ini.'
            ], 409); // 409 Conflict
        }
    }
}