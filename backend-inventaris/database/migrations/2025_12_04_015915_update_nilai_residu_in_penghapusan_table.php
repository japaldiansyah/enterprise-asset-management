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
        Schema::table('penghapusan', function (Blueprint $table) {
            // Mengubah tipe data dari string/varchar menjadi DECIMAL
            // DECIMAL(15, 2) disarankan untuk nilai uang.
            $table->decimal('nilai_residu', 15, 2)->default(0)->change();
        });
    }

    /**
     * Balikkan (rollback) migrasi.
     */
    public function down(): void
    {
        Schema::table('penghapusan', function (Blueprint $table) {
            // Mengembalikan tipe data ke string/varchar (sesuaikan panjangnya)
            $table->string('nilai_residu', 255)->change(); 
        });
    }
};