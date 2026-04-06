<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string $role - Role yang diharapkan (misal: 'admin' atau 'karyawan')
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        // 1. Cek apakah pengguna sudah terautentikasi
        if (!$request->user()) {
             // Jika tidak ada user (401 Unauthorized)
             return response()->json(['message' => 'Tidak terautentikasi. Silakan login terlebih dahulu.'], 401);
        }

        // 2. Cek apakah role pengguna sesuai dengan role yang diminta
        if ($request->user()->role !== $role) {
            // Jika role tidak cocok (403 Forbidden)
            return response()->json([
                'message' => 'Anda tidak memiliki otorisasi sebagai ' . strtoupper($role) . ' untuk mengakses sumber daya ini.'
            ], 403);
        }

        // 3. Jika otorisasi berhasil, lanjutkan permintaan
        return $next($request);
    }
}