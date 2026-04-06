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
        Schema::create('laporan_kerusakan', function (Blueprint $table) {
            $table->id('id_laporan');
            $table->foreignId('id_barang')->references('id_barang')->on('barang');
            $table->foreignId('id_penanggungjawab')->references('id_penanggungjawab')->on('penanggungjawab');
            $table->date('tanggal_lapor');
            $table->text('deskripsi');
            $table->enum('tingkat', ['rusak ringan', 'rusak berat']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('laporan_kerusakan');
    }
};
