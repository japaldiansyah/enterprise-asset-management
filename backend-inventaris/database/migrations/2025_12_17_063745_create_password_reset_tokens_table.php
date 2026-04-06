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
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            // Email menjadi primary key karena satu email hanya boleh punya satu token aktif
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable(); // Untuk mengecek masa kadaluarsa (misal 60 menit)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
    }
};
