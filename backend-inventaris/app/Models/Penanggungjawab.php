<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Penanggungjawab extends Model
{
    protected $table = 'penanggungjawab';

    protected $primaryKey = 'id_penanggungjawab';

    protected $fillable = [
        'nama_pegawai',
        'jabatan',
        'divisi'
    ];

    public function barang()
    {
        // Asumsi: foreign key di tabel 'barang' adalah 'id_penanggungjawab'
        return $this->hasMany(Barang::class, 'id_penanggungjawab', 'id_penanggungjawab');
    }
}
