<?php

namespace App\Http\Controllers;

use App\Models\Pengembalian;
use App\Models\Penanggungjawab;
use App\Models\Peminjaman;
use App\Models\Barang;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; 

class PengembalianController extends Controller
{
    /**
     * Menampilkan semua data pengembalian
     */
    public function index()
    {
        $data = Pengembalian::with(['peminjaman.barang', 'peminjaman.penanggungjawab'])->get();

        return response()->json([
            'status' => 'success',
            'data' => $data
        ], 200);
    }

    /**
     * Menyimpan data pengembalian baru
     */
    

    public function store(Request $request)
    {
        $request->validate([
            'id_peminjaman' => 'required|exists:peminjaman,id_peminjaman',
            'tanggal_kembali' => 'required|date',
            'kondisi_kembali' => 'required|string|max:255'
        ]);

        try {
            $data = DB::transaction(function () use ($request) {
                $peminjaman = Peminjaman::findOrFail($request->id_peminjaman);
                
                // Simpan Pengembalian
                $pengembalian = Pengembalian::create($request->all());

                // Update Peminjaman
                $peminjaman->update(['status' => 'dikembalikan']);

                // Update Barang (Status & Kondisi)
                $barang = Barang::findOrFail($peminjaman->id_barang);

              
                $namaPeminjam = $peminjaman->penanggungjawab ? $peminjaman->penanggungjawab->nama_pegawai : 'Nama Tidak Ditemukan';
                
                $tglKembali = Carbon::parse($request->tanggal_kembali)
                            ->locale('id')
                            ->translatedFormat('d F Y');

                $barang->update([
                    'status' => 'tersedia',
                    'kondisi' => $request->kondisi_kembali
                ]);

                $barang->addLog('Pengembalian', 
                "Aset telah dikembalikan oleh {$namaPeminjam} dengan kondisi {$request->kondisi_kembali}. 
                Pada tanggal {$tglKembali}");

                return $pengembalian;
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Pengembalian berhasil dicatat',
                'data' => $data
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Menampilkan detail satu pengembalian
     */
    public function show($id)
    {
        $pengembalian = Pengembalian::with(['peminjaman.barang', 'peminjaman.penanggungjawab'])->find($id);

        if (!$pengembalian) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengembalian tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $pengembalian
        ], 200);
    }

    /**
     * Update data pengembalian
     */
    public function update(Request $request, $id)
    {
        $pengembalian = Pengembalian::find($id);

        if (!$pengembalian) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengembalian tidak ditemukan'
            ], 404);
        }

        $request->validate([
            'tanggal_kembali' => 'sometimes|date',
            'kondisi_kembali' => 'sometimes|string|max:255'
        ]);

        $pengembalian->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Pengembalian berhasil diperbarui',
            'data' => $pengembalian
        ], 200);
    }

    /**
     * Menghapus data pengembalian
     */
    public function destroy($id)
    {
        $pengembalian = Pengembalian::find($id);

        if (!$pengembalian) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengembalian tidak ditemukan'
            ], 404);
        }

        $pengembalian->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Pengembalian berhasil dihapus'
        ], 200);
    }
}
