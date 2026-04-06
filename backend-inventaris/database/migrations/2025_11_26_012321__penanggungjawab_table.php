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
        Schema::create('penanggungjawab', function (Blueprint $table) {
            $table->id('id_penanggungjawab');
            $table->string('nama_pegawai');
            $table->string('jabatan');
            $table->string('divisi');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('penanggungjawab');
    }
};
