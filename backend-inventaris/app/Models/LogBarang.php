<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LogBarang extends Model
{
    use HasFactory;

    protected $table = 'log_barang';
    protected $primaryKey = 'id_log';

    protected $fillable = [
        'id_barang',
        'aksi',
        'deskripsi',
        'operator'
    ];

    public function barang()
    {
        return $this->belongsTo(Barang::class, 'id_barang', 'id_barang');
    }
}
