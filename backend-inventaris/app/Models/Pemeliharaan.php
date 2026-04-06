<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pemeliharaan extends Model
{
    protected $table = 'pemeliharaan'; 

    protected $primaryKey = 'id_pemeliharaan';

    protected $fillable = [
        'id_barang',
        'jenis_perbaikan',
        'vendor',
        'biaya',
        'tanggal',
        'keterangan',
        'status_pemeliharaan', 
        'tanggal_selesai'
    ];

    public function barang()
    {
        return $this->belongsTo(Barang::class, 'id_barang');
    }
}
