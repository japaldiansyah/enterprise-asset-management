<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Penghapusan extends Model
{
    protected $table = 'penghapusan';

    protected $primaryKey = 'id_penghapusan';

    protected $fillable = [
        'id_barang',
        'tanggal',
        'alasan',
        'nilai_residu'
    ];

    public function barang()
    {
        return $this->belongsTo(Barang::class, 'id_barang');
    }
}
