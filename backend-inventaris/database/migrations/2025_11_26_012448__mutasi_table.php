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
        Schema::create('mutasi', function (Blueprint $table) {
            $table->id('id_mutasi');
            $table->unsignedBigInteger('id_barang');
            $table->string('lokasi_awal');
            $table->string('lokasi_tujuan');
            $table->date('tanggal_mutasi');
            $table->string('penanggungjawab_baru');
            $table->timestamps();

            $table->foreign('id_barang')->references('id_barang')->on('barang');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mutasi');
    }
};
