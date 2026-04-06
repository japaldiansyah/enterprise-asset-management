<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user', function (Blueprint $table) {
            // Ganti nama kolom 'username' menjadi 'email'
            $table->renameColumn('username', 'email');
        });
    }

    public function down(): void
    {
        Schema::table('user', function (Blueprint $table) {
            // Jika rollback, kembalikan nama kolom dari 'email' menjadi 'username'
            $table->renameColumn('email', 'username');
        });
    }
};