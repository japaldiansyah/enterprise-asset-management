<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('kategori', function (Blueprint $table) {
            // Tambahkan kolom integer setelah nama_kategori
            $table->integer('masa_manfaat_tahun')
                ->default(5)
                ->after('nama_kategori'); 
        });
    }

    // Fungsi 'down' (Saat membatalkan/rollback migrasi)
    public function down()
    {
        Schema::table('kategori', function (Blueprint $table) {
            // Hapus kolom jika migrasi dibatalkan
            $table->dropColumn('masa_manfaat_tahun');
        });
    }
};
