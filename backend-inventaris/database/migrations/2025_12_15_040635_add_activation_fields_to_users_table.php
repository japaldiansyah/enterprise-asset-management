<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jalankan migrasi.
     */
    public function up(): void
    {
        // PENTING: Untuk mengubah kolom yang sudah ada, Anda mungkin perlu 
        // menginstal library doctrine/dbal jika belum ada: composer require doctrine/dbal
        Schema::table('user', function (Blueprint $table) {
            // 1. Modifikasi kolom 'password' menjadi bisa NULL (nullable)
            $table->string('password')->nullable()->change(); 

            // 2. Tambahkan kolom 'activation_token'
            $table->string('activation_token', 60)->nullable()->after('password');

            // 3. Tambahkan kolom 'token_expires_at'
            $table->timestamp('token_expires_at')->nullable()->after('activation_token');

            // 4. Tambahkan kolom 'is_active'
            // Nilai default FALSE: Akun belum aktif saat pertama dibuat.
            $table->boolean('is_active')->default(false)->after('role'); 
        });
    }

    /**
     * Batalkan migrasi (rollback).
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Hapus 3 kolom baru
            $table->dropColumn(['activation_token', 'token_expires_at', 'is_active']);

            // Kembalikan kolom 'password' menjadi NOT NULL
            $table->string('password')->nullable(false)->change();
        });
    }
};