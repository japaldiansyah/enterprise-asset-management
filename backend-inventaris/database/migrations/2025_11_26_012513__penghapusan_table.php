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
        Schema::create('penghapusan', function (Blueprint $table) {
            $table->id('id_penghapusan');
            $table->unsignedBigInteger('id_barang');
            $table->date('tanggal');
            $table->string('alasan');
            $table->string('nilai_residu');
            $table->timestamps();

            $table->foreign('id_barang')->references('id_barang')->on('barang');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('penghapusan');
    }
};
