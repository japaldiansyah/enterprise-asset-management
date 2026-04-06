<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lokasi extends Model
{
    protected $table = 'lokasi';

    protected $primaryKey = 'id_lokasi';
    
    protected $fillable = [
        'nama_lokasi'
    ];

    public function barang()
    {
        // Asumsikan foreign key di tabel 'barang' adalah 'id_kategori'
        return $this->hasMany(Barang::class, 'id_lokasi', 'id_lokasi');
    }
}
