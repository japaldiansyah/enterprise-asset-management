<?php

namespace App\Http\Controllers;

use App\Models\Penghapusan;
use App\Models\Barang;
use Illuminate\Http\Request;
use Carbon\Carbon;

class PenghapusanController extends Controller
{
    /**
     * Menampilkan semua data penghapusan
     */
    public function index()
    {
        $data = Penghapusan::with('barang')->get();

        return response()->json([
            'status' => 'success',
            'data'   => $data
        ], 200);
    }

    /**
     * Menyimpan data penghapusan baru
     */
    public function store(Request $request)
    {
        $request->validate([
            'id_barang'    => 'required|exists:barang,id_barang',
            'tanggal'      => 'required|date',
            'alasan'       => 'required|string',
            'nilai_residu'   => 'required|numeric|min:0'
        ]);

        // Buat record penghapusan
        $hapus = Penghapusan::create($request->all());

        // Update status barang → dihapus
        $barang = Barang::find($request->id_barang);
        $tglPenghapusan = Carbon::parse($request->tanggal)
                            ->locale('id')
                            ->translatedFormat('d F Y');

        $barang->update(['status' => 'dihapus']);

        $barang->addLog('Penghapusan', 
        "Aset dihapus dari sistem dengan alasan: {$request->alasan}.
        Pada tanggal {$tglPenghapusan}");

        return response()->json([
            'status'  => 'success',
            'message' => 'Data penghapusan berhasil ditambahkan',
            'data'    => $hapus
        ], 201);
    }

    /**
     * Menampilkan detail data penghapusan
     */
    public function show($id)
    {
        $data = Penghapusan::with('barang')->find($id);

        if (!$data) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data penghapusan tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $data
        ], 200);
    }

    /**
     * Mengupdate data penghapusan
     */
    public function update(Request $request, $id)
    {
        $hapus = Penghapusan::find($id);

        if (!$hapus) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data penghapusan tidak ditemukan'
            ], 404);
        }

        $request->validate([
            'tanggal'      => 'sometimes|date',
            'alasan'       => 'sometimes|string',
            'nilai_residu'   => 'sometimes|numeric'
        ]);

        $hapus->update($request->all());

        return response()->json([
            'status'  => 'success',
            'message' => 'Data penghapusan berhasil diperbarui',
            'data'    => $hapus
        ], 200);
    }

    /**
     * Menghapus data penghapusan
     */
    public function destroy($id)
    {
        $hapus = Penghapusan::find($id);

        if (!$hapus) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data penghapusan tidak ditemukan'
            ], 404);
        }

        $hapus->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Data penghapusan berhasil dihapus'
        ], 200);
    }
}
