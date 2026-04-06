<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run()
    {
        DB::table('user')->insert([
            'email' => 'admin@dummy.com', // Ganti dengan email Admin yang valid
            'password' => Hash::make('admin54321'), 
            'role' => 'Admin', // ROLE TERTINGGI
            'is_active' => true, // Akun Admin langsung aktif
            'created_at' => now(),
            'updated_at' => now(),
            // activation_token, token_expires_at, diisi NULL (default)
        ]);
    }
}
