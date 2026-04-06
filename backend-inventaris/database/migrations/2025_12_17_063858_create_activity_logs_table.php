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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->string('email');
            $table->string('activity'); // Contoh: "Minta Reset Password" atau "Berhasil Reset Password"
            $table->string('ip_address')->nullable(); // Opsional: untuk melacak lokasi pengakses
            $table->string('browser')->nullable();    // Opsional: untuk melacak perangkat yang digunakan
            $table->timestamps(); // Ini akan otomatis mengisi 'created_at' (tanggal & jam)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
