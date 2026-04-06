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
        Schema::create('peminjaman', function (Blueprint $table) {
            $table->id('id_peminjaman');
            $table->unsignedBigInteger('id_barang');
            $table->unsignedBigInteger('id_penanggungjawab');
            $table->date('tanggal_pinjam');
            $table->date('tanggal_rencana_kembali');
            $table->enum('status', ['dipinjam', 'dikembalikan']);
            $table->timestamps();

            $table->foreign('id_barang')->references('id_barang')->on('barang');
            $table->foreign('id_penanggungjawab')->references('id_penanggungjawab')->on('penanggungjawab');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('peminjaman');
    }
};
