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
        Schema::create('log_barang', function (Blueprint $table) {
            $table->id('id_log');
            $table->unsignedBigInteger('id_barang');
            
            // Aksi bisa berupa: 'Penambahan', 'Laporan Kerusakan', 'Penghapusan', 'Update Data'
            $table->string('aksi'); 
            
            // Deskripsi detail mengenai apa yang berubah
            $table->text('deskripsi'); 
            
            // Opsional: Siapa yang melakukan aksi (jika ada sistem login)
            $table->string('operator')->nullable(); 

            $table->timestamps(); // Ini akan otomatis membuat created_at sebagai tanggal log

            // Relasi ke tabel barang
            $table->foreign('id_barang')
                ->references('id_barang')
                ->on('barang')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('log_barangs');
    }
};
