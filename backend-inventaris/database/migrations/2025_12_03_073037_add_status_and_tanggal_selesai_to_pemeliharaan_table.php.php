<?php

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
        Schema::table('pemeliharaan', function (Blueprint $table) {
            // 1. Kolom Status Pemeliharaan: Default 'proses'
            $table->enum('status_pemeliharaan', ['proses', 'selesai', 'batal'])
                ->default('proses')
                ->after('keterangan');

            // 2. Kolom Tanggal Selesai: Bisa NULL (karena baru selesai diisi saat action)
            $table->date('tanggal_selesai')->nullable()->after('status_pemeliharaan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
