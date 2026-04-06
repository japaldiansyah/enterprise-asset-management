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
        Schema::create('barang', function (Blueprint $table) {
            $table->id('id_barang');
            $table->string('kode_barang')->unique();
            $table->string('nama_barang');
            $table->unsignedBigInteger('id_kategori');
            $table->string('merk');
            $table->date('tanggal_perolehan');
            $table->decimal('nilai_perolehan', 12, 2);
            $table->enum('kondisi', ['baik', 'rusak ringan', 'rusak berat']);
            $table->enum('status', ['tersedia', 'dipinjam', 'diperbaiki', 'dihapus']);
            $table->unsignedBigInteger('id_lokasi');
            $table->unsignedBigInteger('id_penanggungjawab');
            $table->string('qr_code_path')->nullable();
            $table->timestamps();

            $table->foreign('id_kategori')->references('id_kategori')->on('kategori');
            $table->foreign('id_lokasi')->references('id_lokasi')->on('lokasi');
            $table->foreign('id_penanggungjawab')->references('id_penanggungjawab')->on('penanggungjawab');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('barang');
    }
};
