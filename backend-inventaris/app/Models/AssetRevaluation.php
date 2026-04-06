<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssetRevaluation extends Model
{
    use HasFactory;

    // Opsional: Jika nama tabel tidak jamak standar, definisikan
    protected $table = 'asset_revaluations';

    // Izinkan mass assignment (create data langsung)
    protected $guarded = ['id'];

    // Ubah format string database menjadi tipe data asli PHP
    protected $casts = [
        'nilai_baru' => 'float',
        'nbv_saat_ini' => 'float',
        'surplus_deficit' => 'float',
        'tanggal_revaluasi' => 'date',
    ];

    // Relasi Balik ke Barang
    public function barang()
    {
        // Parameter: (ModelTujuan, FK_di_tabel_ini, PK_di_tabel_tujuan)
        return $this->belongsTo(Barang::class, 'barang_id', 'id_barang');
    }
}