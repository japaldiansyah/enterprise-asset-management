<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Peminjaman extends Model
{
    protected $table = 'peminjaman';

    protected $primaryKey = 'id_peminjaman';

    protected $fillable = [
        'id_barang',
        'id_penanggungjawab',
        'tanggal_pinjam',
        'tanggal_rencana_kembali',
        'status'
    ];

    public function barang()
    {
        return $this->belongsTo(Barang::class, 'id_barang');
    }

    public function penanggungjawab()
    {
        return $this->belongsTo(Penanggungjawab::class, 'id_penanggungjawab');
    }
}
