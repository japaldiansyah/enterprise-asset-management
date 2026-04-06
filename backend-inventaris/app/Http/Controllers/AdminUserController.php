<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\UserInvitation;
use Illuminate\Validation\ValidationException;

class AdminUserController extends Controller
{
    // =========================================================
    // METHOD 1: INVITE USER (CREATE) - (Tidak ada perubahan signifikan)
    // =========================================================
    public function inviteUser(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:user,email', 
            'role' => 'required|string|in:admin,user,staf,supervisor', 
        ]);
        
        $token = Str::random(60); 
        $expiresAt = now()->addHours(24);
        $activationUrl = config('app.frontend_url') . '/activate?token=' . $token; 

        try {
            $user = User::create([
                'email' => $request->email,
                'role' => $request->role,
                'password' => null, 
                'is_active' => false, 
                'activation_token' => $token,
                'token_expires_at' => $expiresAt,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal membuat akun di database.'], 500);
        }

        try {
            Mail::to($user->email)->send(new UserInvitation($user, $activationUrl));
        } catch (\Exception $e) {
            $user->delete(); 
            // DEBUG: Ganti pesan custom dengan error asli dari Resend
            \Log::error("Gagal kirim email invite ke {$user->email}: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal mengirim email aktivasi. Harap periksa kembali koneksi internet atau coba lagi beberapa saat lagi.'
            ], 500);
        }
        
        return response()->json([
            'message' => 'Undangan berhasil dikirim. Karyawan harus mengaktifkan akun dalam 24 jam.',
            'user' => $user->only('id_user', 'email', 'role')
        ], 201);
    }
    
    // =========================================================
    // METHOD 2: MENAMPILKAN DAFTAR USER (READ) DENGAN PRIORITAS
    // =========================================================
    public function index()
    {
        // PENGURUTAN PRIORITAS: 1. Non-aktif, 2. Kadaluarsa, 3. Terbaru
        $users = User::orderBy('is_active', 'asc') 
                      ->orderBy('token_expires_at', 'asc') 
                      ->orderBy('id_user', 'desc') 
                      // MENAMBAH KOLOM AUDIT (created_at, updated_at) UNTUK MODAL DETAIL
                      ->get(['id_user', 'name', 'email', 'role', 'is_active', 'activation_token', 'token_expires_at', 'created_at', 'updated_at']);

        $formattedUsers = $users->map(function ($user) {
            $isExpired = false;
            if (!$user->is_active && $user->token_expires_at) {
                $isExpired = $user->token_expires_at->isPast(); 
            }
            
            $statusText = 'Aktif';
            if (!$user->is_active) {
                if ($user->activation_token === null) {
                    $statusText = 'Dinonaktifkan'; // Akun aktif yang dicabut aksesnya
                } else {
                    $statusText = $isExpired ? 'Kadaluwarsa' : 'Menunggu Aktivasi';
                }
            }

            return [
                'id' => $user->id_user,
                'email' => $user->email,
                'role' => $user->role,
                'name' => $user->name,
                
                'status_text' => $statusText,
                'is_active' => $user->is_active,
                'is_expired' => $isExpired,

                // TAMBAHAN DATA AUDIT UNTUK MODAL DETAIL
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
                'token_expires_at' => $user->token_expires_at,
                
                // Hapus Permanen hanya boleh untuk akun non-aktif dengan token (Pruning)
                'can_delete' => !$user->is_active && $user->activation_token !== null
            ];
        });

        return response()->json($formattedUsers);
    }

    // =========================================================
    // METHOD 3: TOGGLE STATUS (ACTIVATE / DEACTIVATE) - BARU
    // =========================================================
    public function toggleStatus(User $user)
    {
        // Pencegahan: Admin tidak boleh menonaktifkan dirinya sendiri
        if (auth()->user()->id_user === $user->id_user) {
            return response()->json(['message' => 'Anda tidak dapat menonaktifkan akun Anda sendiri.'], 403);
        }

        $newStatus = !$user->is_active;

        $user->is_active = $newStatus;
        
        if ($newStatus) {
            // Jika diaktifkan, hapus semua token lama (menjadi akun aktif penuh)
            $user->activation_token = null;
            $user->token_expires_at = null;
        }

        $user->save();

        $statusText = $newStatus ? 'diaktifkan kembali' : 'dinonaktifkan';

        return response()->json([
            'message' => "Akun {$user->email} berhasil {$statusText}.",
            'is_active' => $newStatus
        ], 200);
    }

    // =========================================================
    // METHOD 4: MENGHAPUS USER SECARA MANUAL (DELETE) - PRUNING
    // =========================================================
    public function destroy(User $user)
    {
        // Admin hanya boleh menghapus akun yang belum pernah aktif (Pruning)
        if ($user->is_active || $user->activation_token === null) {
             return response()->json([
                'message' => 'Akun ini sudah pernah/sedang aktif. Harap gunakan fitur NONAKTIFKAN untuk mencabut akses.'
            ], 403);
        }

        try {
            $user->delete();
            return response()->json(['message' => 'Akun pengguna berhasil dihapus (Pruning).'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal menghapus akun karena masalah integritas data.'], 500);
        }
    }
}