<?php

namespace App\Http\Controllers;

use App\Models\Peminjaman;
use App\Models\Penanggungjawab;
use App\Models\Barang;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PeminjamanController extends Controller
{
    public function getLatestActivities()
    {
        try {
            // 1. Log Peminjaman
            $peminjaman = DB::table('peminjaman')
                ->join('barang', 'peminjaman.id_barang', '=', 'barang.id_barang')
                ->join('penanggungjawab', 'peminjaman.id_penanggungjawab', '=', 'penanggungjawab.id_penanggungjawab')
                ->select(
                    DB::raw("'Peminjaman' as tipe"),
                    'barang.nama_barang',
                    'barang.kode_barang',
                    DB::raw("CONCAT('Oleh: ', penanggungjawab.nama_pegawai) as keterangan"),
                    'peminjaman.created_at'
                );

            // 2. Log Pengembalian (Join lewat peminjaman untuk dapat data barang)
            $pengembalian = DB::table('pengembalian')
                ->join('peminjaman', 'pengembalian.id_peminjaman', '=', 'peminjaman.id_peminjaman')
                ->join('barang', 'peminjaman.id_barang', '=', 'barang.id_barang')
                ->select(
                    DB::raw("'Pengembalian' as tipe"),
                    'barang.nama_barang',
                    'barang.kode_barang',
                    DB::raw("CONCAT('Kondisi: ', pengembalian.kondisi_kembali) as keterangan"),
                    'pengembalian.created_at'
                );

            // 3. Log Mutasi
            $mutasi = DB::table('mutasi')
                ->join('barang', 'mutasi.id_barang', '=', 'barang.id_barang')
                ->join('lokasi as l1', 'mutasi.lokasi_awal', '=', 'l1.id_lokasi')
                ->join('lokasi as l2', 'mutasi.lokasi_tujuan', '=', 'l2.id_lokasi')
                ->select(
                    DB::raw("'Mutasi' as tipe"),
                    'barang.nama_barang',
                    'barang.kode_barang',
                    DB::raw("CONCAT(l1.nama_lokasi, ' → ', l2.nama_lokasi) as keterangan"),
                    'mutasi.created_at'
                )
                ->union($peminjaman)
                ->union($pengembalian)
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => $mutasi
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
     * Menampilkan semua data peminjaman
     */
    public function index()
    {
        $data = Peminjaman::with(['barang', 'penanggungjawab'])->get();

        return response()->json([
            'status' => 'success',
            'data' => $data
        ], 200);
    }

    /**
     * Menyimpan data peminjaman baru
     */
    public function store(Request $request)
    {
        // 1. Validasi data dari request
        $validatedData = $request->validate([
            'id_barang' => 'required|integer',
            'id_penanggungjawab' => 'required|integer',
            'tanggal_pinjam' => 'required|date',
            'tanggal_rencana_kembali' => 'required|date',
            // 'status' tidak ada di validasi karena diisi otomatis
        ]);

        // 2. Tambahkan status secara OTOMATIS
        $validatedData['status'] = 'dipinjam'; // <--- Bagian terpenting

        // 3. Simpan data ke database
        $peminjaman = Peminjaman::create($validatedData);

        // 4. Update status barang menjadi 'dipinjam'
        $barang = Barang::find($validatedData['id_barang']);
        if ($barang) {
            $barang->status = 'dipinjam';
            $barang->save();
        }
        
        $pj = Penanggungjawab::find($request->id_penanggungjawab);
        $namaPeminjam = $pj ? $pj->nama_pegawai : 'Nama Tidak Ditemukan';

        // 2. Format Tanggal ke Bahasa Indonesia
        $tglKembali = Carbon::parse($request->tanggal_rencana_kembali)
                            ->locale('id')
                            ->translatedFormat('d F Y');

        $barang->addLog(
            'Peminjaman', 
            "Aset dipinjam oleh {$namaPeminjam}. Rencana pengembalian pada tanggal {$tglKembali}"
        );
        
        return response()->json(['message' => 'Peminjaman berhasil dicatat', 'data' => $peminjaman], 201);
    }

    /**
     * Menampilkan detail peminjaman
     */
    public function show($id)
    {
        $peminjaman = Peminjaman::with(['barang', 'penanggungjawab'])->find($id);

        if (!$peminjaman) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data peminjaman tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $peminjaman
        ], 200);
    }

    /**
     * Mengupdate data peminjaman
     */
    public function update(Request $request, $id)
    {
        $peminjaman = Peminjaman::find($id);

        if (!$peminjaman) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data peminjaman tidak ditemukan'
            ], 404);
        }

        $request->validate([
            'id_barang' => 'sometimes|exists:barang,id_barang',
            'id_penanggungjawab' => 'sometimes|exists:penanggungjawab,id_penanggungjawab',
            'tanggal_pinjam' => 'sometimes|date',
            'tanggal_rencana_kembali' => 'sometimes|date',
            'status' => 'sometimes|in:dipinjam,dikembalikan'
        ]);

        $peminjaman->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Peminjaman berhasil diperbarui',
            'data' => $peminjaman
        ], 200);
    }

    /**
     * Menghapus data peminjaman
     */
    public function destroy($id)
    {
        $peminjaman = Peminjaman::find($id);

        if (!$peminjaman) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data peminjaman tidak ditemukan'
            ], 404);
        }

        $peminjaman->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Peminjaman berhasil dihapus'
        ], 200);
    }
}
