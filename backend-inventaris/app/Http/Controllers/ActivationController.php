<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash; // Import Hash jika password tidak di-hash oleh mutator
use Illuminate\Validation\ValidationException;
use Carbon\Carbon; // Pastikan Carbon diimport jika Anda menggunakannya di luar Model

class ActivationController extends Controller
{
    public function activate(Request $request)
    {
        // 1. Validasi Input
        $request->validate([
            'token' => 'required|string|max:60',
            'name' => 'required|string|max:100', // <<< PERUBAHAN UTAMA: Tambah validasi Nama
            'password' => 'required|string|min:8|confirmed',
        ]);

        // 2. Cari Pengguna Berdasarkan Token
        // Diasumsikan token_expires_at sudah di-cast ke datetime
        $user = User::where('activation_token', $request->token)
                    ->where('is_active', false) // Pastikan hanya akun non-aktif yang bisa diaktivasi
                    ->first();

        // 3. Pengecekan Keamanan Token
        if (!$user) {
            throw ValidationException::withMessages([
                'token' => ['Tautan aktivasi tidak valid atau sudah digunakan.'],
            ]);
        }

        // 4. Cek Kadaluarsa Token
        // Gunakan Carbon::parse jika token_expires_at bukan Carbon object
        if ($user->token_expires_at && Carbon::parse($user->token_expires_at)->isPast()) { 
            // Opsional: Hapus token kadaluarsa
            $user->update([
                'activation_token' => null,
                'token_expires_at' => null,
            ]);
            throw ValidationException::withMessages([
                'token' => ['Tautan aktivasi telah kadaluarsa. Mohon hubungi Admin.'],
            ]);
        }

        // 5. Finalisasi Akun
        $user->update([
            'name' => $request->name, // <<< PERUBAHAN UTAMA: Menyimpan Nama
            'password' => Hash::make($request->password), // Gunakan Hash::make() jika tidak ada mutator di Model
            'is_active' => true,
            'activation_token' => null,
            'token_expires_at' => null,
        ]);

        return response()->json([
            'message' => 'Akun berhasil diaktifkan. Anda dapat login sekarang.',
        ], 200);
    }
}