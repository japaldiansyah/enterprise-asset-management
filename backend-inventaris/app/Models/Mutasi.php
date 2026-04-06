<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Mutasi extends Model
{
    protected $table = 'mutasi';

    protected $primaryKey = 'id_mutasi';

    protected $fillable = [
        'id_barang',
        'lokasi_awal',
        'lokasi_tujuan',
        'tanggal_mutasi',
        'penanggungjawab_baru',
    ];

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
    public function barang()
    {
        return $this->belongsTo(Barang::class, 'id_barang', 'id_barang');
    }
}
