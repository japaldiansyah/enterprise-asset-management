<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash; // Tambahkan Hash
use Illuminate\Validation\ValidationException;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // 1. Validasi Input: Gunakan 'email'
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // 2. Cari User dan Cek Password
        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau Password tidak valid.'],
            ]);
        }
        
        // 3. Pengecekan Status Aktivasi (PENTING)
        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Akun Anda belum diaktifkan. Silakan cek email untuk tautan aktivasi.'],
            ]);
        }
        
        // 4. Autentikasi Berhasil
        $token = $user->createToken('web-token', [$user->role])->plainTextToken;

        // 5. Kirim respons
        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id_user,
                'email' => $user->email, // Kirim email
                'name' => $user->name,
                'role' => $user->role, 
            ],
        ]);
    }
    
    // Hapus atau nonaktifkan fungsi register()
    public function register(Request $request)
    {
        return response()->json(['message' => 'Registrasi ditutup. Akun dibuat melalui undangan Admin.'], 403);
    }
    
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete(); 
        return response()->json(['message' => 'Berhasil logout']);
    }
}