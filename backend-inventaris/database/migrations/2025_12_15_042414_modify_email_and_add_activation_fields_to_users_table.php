<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user', function (Blueprint $table) {
            // --- MODIFIKASI KOLOM YANG SUDAH ADA ---

            // 1. Terapkan properti UNIQUE pada kolom 'email' (Wajib untuk login)
            $table->string('email')->unique()->change();

            // 2. Ubah kolom 'password' menjadi nullable (Wajib untuk alur Invitation)
            $table->string('password')->nullable()->change();

            // --- TAMBAH KOLOM UNTUK INVITATION ---

            // 3. Tambahkan kolom 'activation_token'
            $table->string('activation_token', 60)->nullable()->after('password');

            // 4. Tambahkan kolom 'token_expires_at'
            $table->timestamp('token_expires_at')->nullable()->after('activation_token');

            // 5. Tambahkan kolom 'is_active' (Default FALSE)
            $table->boolean('is_active')->default(false)->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('user', function (Blueprint $table) {
            // Hapus 3 kolom baru
            $table->dropColumn(['activation_token', 'token_expires_at', 'is_active']);
            
            // Kembalikan kolom 'password' menjadi NOT NULL
            $table->string('password')->nullable(false)->change();

            // Hapus batasan UNIQUE pada kolom 'email'
            // (Anda mungkin perlu menghapus index secara eksplisit tergantung versi DB/Laravel Anda, 
            // tapi change() seringkali sudah menangani ini)
            $table->dropUnique(['email']);
            $table->string('email')->change(); 
        });
    }
};