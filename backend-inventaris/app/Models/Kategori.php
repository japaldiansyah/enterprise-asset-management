<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kategori extends Model
{
     protected $table = 'kategori'; 

    protected $primaryKey = 'id_kategori';

    protected $fillable = [
        'nama_kategori',
        'masa_manfaat_tahun',
    ];

    public function barang()
    {
        // Asumsikan foreign key di tabel 'barang' adalah 'id_kategori'
        return $this->hasMany(Barang::class, 'id_kategori', 'id_kategori');
    }
}
