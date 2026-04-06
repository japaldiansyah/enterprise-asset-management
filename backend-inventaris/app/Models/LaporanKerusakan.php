<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LaporanKerusakan extends Model
{
    protected $table = 'laporan_kerusakan';
    protected $primaryKey = 'id_laporan';
    protected $fillable = [
        'id_barang',
        'id_penanggungjawab',
        'tanggal_lapor',
        'deskripsi',
        'tingkat'
    ];
}
