<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
// TAMBAHKAN DUA BARIS DI BAWAH INI:
use Illuminate\Support\Facades\DB; 
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run()
    {
        // Pastikan nama tabelnya 'users' (dengan 's') jika menggunakan migration default Laravel
        DB::table('user')->insert([
            'email' => 'itnasaonline@gmail.com',
            'password' => Hash::make('NaSa72'), 
            'role' => 'Admin', 
            'is_active' => true, 
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}