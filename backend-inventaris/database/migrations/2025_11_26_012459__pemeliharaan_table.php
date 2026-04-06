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
        Schema::create('pemeliharaan', function (Blueprint $table) {
            $table->id('id_pemeliharaan');
            $table->unsignedBigInteger('id_barang');
            $table->string('jenis_perbaikan');
            $table->string('vendor');
            $table->decimal('biaya', 12, 2);
            $table->date('tanggal');
            $table->string('keterangan')->nullable();
            $table->timestamps();

            $table->foreign('id_barang')->references('id_barang')->on('barang');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pemeliharaan');
    }
};
