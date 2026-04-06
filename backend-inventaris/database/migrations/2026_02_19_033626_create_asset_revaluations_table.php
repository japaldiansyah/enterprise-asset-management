<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('asset_revaluations', function (Blueprint $table) {
            $table->id(); // PK tabel ini tetap 'id' (standar)
            
            // RELASI KHUSUS (PENTING!)
            // Karena PK barang adalah 'id_barang', kita harus menuliskannya secara eksplisit
            $table->foreignId('barang_id')
                ->constrained(table: 'barang', column: 'id_barang') 
                ->onDelete('cascade');

            // DATA UTAMA
            $table->date('tanggal_revaluasi');     // Kapan dinilai ulang?
            $table->decimal('nilai_baru', 15, 2);  // Nilai Pasar (Input: 88 Juta)
            $table->integer('sisa_umur_baru');     // Sisa Umur (Input: 8 Tahun)

            // DATA SNAPSHOT (Metode Eliminasi)
            $table->decimal('nbv_saat_ini', 15, 2); // Nilai Buku Lama (80 Juta)
            $table->decimal('surplus_deficit', 15, 2); // Selisih (+8 Juta)
            
            $table->text('keterangan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_revaluations');
    }
};
