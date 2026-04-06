<?php

// database/migrations/xxxx_update_roles_enum_on_user_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Menggunakan nama tabel tunggal Anda: 'user'
        Schema::table('user', function (Blueprint $table) {
            
            // Ubah kolom 'role' untuk memasukkan semua 4 role yang dibutuhkan.
            // Pastikan Anda memilih default role yang baru.
            $table->enum('role', ['admin', 'supervisor', 'staf', 'user'])
                  ->default('user') 
                  ->change(); // Perintah 'change()' wajib untuk memodifikasi kolom yang sudah ada.
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Rollback ke ENUM sebelumnya jika diperlukan.
        Schema::table('user', function (Blueprint $table) {
            $table->enum('role', ['admin', 'karyawan'])->default('karyawan')->change();
        });
    }
};