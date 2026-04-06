<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Barang extends Model
{
    // Nama tabel (karena tidak menggunakan s plural)
    protected $table = 'barang';

    // Primary key tabel
    protected $primaryKey = 'id_barang';

    // Kolom yang bisa diisi
    protected $fillable = [
        'kode_barang',
        'nama_barang',
        'id_kategori',
        'merk',
        'tanggal_perolehan',
        'nilai_perolehan',
        'kondisi',
        'status',
        'id_lokasi',
        'id_penanggungjawab',
        'qr_code_path'
    ];

    // Relasi ke tabel kategori
    public function kategori()
    {
        return $this->belongsTo(Kategori::class, 'id_kategori', 'id_kategori');
    }

    public function lokasi()
    {
        return $this->belongsTo(Lokasi::class, 'id_lokasi', 'id_lokasi');
    }

    public function penanggungjawab()
    {
        return $this->belongsTo(Penanggungjawab::class, 'id_penanggungjawab', 'id_penanggungjawab');
    }


    // Relasi ke peminjaman
    public function peminjaman()
    {
        return $this->hasMany(Peminjaman::class, 'id_barang');
    }

    // Relasi ke pengembalian
    public function pengembalian()
    {
        return $this->hasMany(Pengembalian::class, 'id_barang');
    }

    // Relasi ke pemeliharaan
    public function pemeliharaan()
    {
        return $this->hasMany(Pemeliharaan::class, 'id_barang');
    }

    // Relasi ke mutasi
    public function mutasi()
    {
        return $this->hasMany(Mutasi::class, 'id_barang');
    }

    // Relasi ke penghapusan
    public function penghapusan()
    {
        return $this->hasOne(Penghapusan::class, 'id_barang', 'id_barang');
    }

    public function addLog($aksi, $deskripsi)
    {
        try {
            return \App\Models\LogBarang::create([
                'id_barang' => $this->id_barang,
                'aksi'      => $aksi,      // Sesuai kolom migrasi: 'aksi'
                'deskripsi' => $deskripsi, // Sesuai kolom migrasi: 'deskripsi'
                'operator'  => auth()->user()->name ?? 'Sistem', // Mengisi 'operator' yang nullable
            ]);
        } catch (\Exception $e) {
            // Jika gagal, hanya tulis ke laravel.log agar kita bisa debug nanti
            \Log::error("Gagal tulis log: " . $e->getMessage());
            return null;
        }
    }
    
    public function revaluations()
    {
        // Parameter: (Model Tujuan, Foreign Key di tabel tujuan, Local Key di tabel ini)
        return $this->hasMany(AssetRevaluation::class, 'barang_id', 'id_barang');
    }

    /**
     * Helper untuk mengambil revaluasi paling baru (terakhir)
     * Diakses via: $barang->latest_revaluation
     */
    public function getLatestRevaluationAttribute()
    {
        return $this->revaluations()
                    ->orderBy('tanggal_revaluasi', 'desc')
                    ->first();
    }
}
