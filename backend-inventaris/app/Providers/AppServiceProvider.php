<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Routing\Router; // <<< WAJIB: Tambahkan ini untuk mengakses Router

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    // Modifikasi method boot() untuk mendaftarkan middleware
    public function boot(Router $router): void // <<< Inject Router di parameter
    {
        // 🚨 SOLUSI UNTUK ERROR 'Target class [role] does not exist'
        // Mendaftarkan alias 'role' agar menunjuk ke RoleMiddleware Anda.
        
        // Pastikan nama class ini benar: \App\Http\Middleware\RoleMiddleware
        $router->aliasMiddleware('role', \App\Http\Middleware\RoleMiddleware::class); 
    }
}