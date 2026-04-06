<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Import SEMUA Controller
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\AdminUserController; // BARU
use App\Http\Controllers\ActivationController; // BARU

use App\Http\Controllers\LaporanKerusakanController; // Tambahkan ini

use App\Http\Controllers\Api\RevaluationController;
use App\Http\Controllers\BarangController;
use App\Http\Controllers\KategoriController;
use App\Http\Controllers\LokasiController;
use App\Http\Controllers\MutasiController;
use App\Http\Controllers\PenanggungjawabController;
use App\Http\Controllers\PeminjamanController;
use App\Http\Controllers\PemeliharaanController;
use App\Http\Controllers\PengembalianController;
use App\Http\Controllers\PenghapusanController;

/*
|--------------------------------------------------------------------------
| A. Public Routes (Akses Tanpa Token)
|--------------------------------------------------------------------------
*/

Route::get('/test', function () {
    return response()->json(['message' => 'API is working']);
});

Route::get('/barang/{id}/download-qr', [BarangController::class, 'downloadQr']);

// Route Autentikasi (Menggunakan EMAIL)
Route::post('/login', [AuthController::class, 'login']);

// Rute Aktivasi Akun (Wajib di luar grup auth:sanctum)
Route::post('/activate', [ActivationController::class, 'activate']); // BARU

// Rute Lupa Password
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink']);
Route::post('/reset-password', [PasswordResetController::class, 'resetPassword']);

// Hapus Route::post('/register', [AuthController::class, 'register']);

/*
|----------------------------------------Route::get('/barang/{id}/download-qr', [BarangController::class, 'downloadQr']);----------------------------------
| B. Authenticated Routes (Wajib Menggunakan Token Sanctum)
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {
    
    Route::post('/logout', [AuthController::class, 'logout']); 
    
    // Ganti 'username' menjadi 'email' di response user
    Route::get('/user', function (Request $request) {
        return $request->user()->only('id_user', 'email', 'role');
    });

    // --- 1. Rute Otorisasi Khusus (Admin) ---
    Route::middleware('role:admin')->group(function () {
        
        // Rute Undangan User Baru (Provisioning)
        Route::post('/admin/invite-user', [AdminUserController::class, 'inviteUser']); // BARU

        Route::get('/admin/user', [AdminUserController::class, 'index']);
        Route::get('/admin/audit-logs', [AuditLogController::class, 'index']);

        // Contoh: Hanya admin yang boleh menghapus data 
        Route::delete('barang/{barang}', [BarangController::class, 'destroy']);
        Route::delete('kategori/{kategori}', [KategoriController::class, 'destroy']);
        Route::delete('lokasi/{lokasi}', [LokasiController::class, 'destroy']);
        Route::delete('penghapusan/{penghapusan}', [PenghapusanController::class, 'destroy']);
        Route::delete('/admin/user/{user}', [AdminUserController::class, 'destroy']);
        Route::patch('/admin/user/{user}/status', [AdminUserController::class, 'toggleStatus']);
        
    });

    // --- 2. Rute Akses Bersama (Admin dan Karyawan) ---
    
    Route::post('/laporan-kerusakan', [LaporanKerusakanController::class, 'store']);

    // Rute Laporan/Statistik
    Route::get('/pemeliharaan/monthly-cost', [PemeliharaanController::class, 'getMonthlyServiceCost']);
    Route::get('barang/monthly-acquisition', [BarangController::class, 'getMonthlyAcquisition']);
    Route::get('barang/monthly-depreciation', [BarangController::class, 'getMonthlyDepreciation']);
    Route::get('barang/monthly-nbv', [BarangController::class, 'getMonthlyNBV']);
    Route::get('peminjaman/latest-activities', [PeminjamanController::class, 'getLatestActivities']);
    // Tambahkan ini di dalam group middleware auth atau di tempat public (sesuai setup Anda)
    Route::get('/barang/summary-stats', [BarangController::class, 'summaryStats']);

    Route::post('/barang/{id}/revaluasi', [RevaluationController::class, 'store']);

    

    // Rute Aksi Tambahan
    Route::patch('/pemeliharaan/{id}/selesai', [PemeliharaanController::class, 'markAsDone']);

    // Rute Relasi
    Route::get('/kategori/{id}/barang', [KategoriController::class, 'getBarangByKategori']);
    Route::get('/lokasi/{id}/barang', [LokasiController::class, 'getBarangByLokasi']);
    Route::get('/penanggungjawab/{id}/barang', [PenanggungjawabController::class, 'getBarangByPenanggungJawab']);
    Route::get('/barang/{id}/logs', [BarangController::class, 'getLogs']);

    // Resource Routes (CRUD Standar)
    Route::apiResource('barang', BarangController::class)->except(['destroy']); 
    Route::apiResource('kategori', KategoriController::class)->except(['destroy']);
    Route::apiResource('lokasi', LokasiController::class)->except(['destroy']);
    
    // Resource lainnya yang mungkin perlu akses penuh oleh user biasa
    Route::apiResource('penanggungjawab', PenanggungjawabController::class);
    Route::apiResource('peminjaman', PeminjamanController::class);
    Route::apiResource('pengembalian', PengembalianController::class);
    Route::apiResource('mutasi', MutasiController::class);
    Route::apiResource('pemeliharaan', PemeliharaanController::class);
    Route::apiResource('penghapusan', PenghapusanController::class)->except(['destroy']);

});