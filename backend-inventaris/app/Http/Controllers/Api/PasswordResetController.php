<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Models\User;
use Carbon\Carbon;
use App\Mail\ResetPasswordMail;

class PasswordResetController extends Controller
{
    // TAHAP 1: Kirim Email Link Reset
    public function sendResetLink(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'Email tidak ditemukan.'], 404);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            ['token' => $token, 'created_at' => Carbon::now()]
        );

        // Link reset yang akan dikirim
        $resetLink = rtrim(config('app.frontend_url'), '/') . '/reset-password?token=' . $token . '&email=' . $request->email;

        try {
            Mail::to($request->email)->send(new ResetPasswordMail($resetLink));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengirim email reset.'], 500);
        }

        // Catat Audit Log
        DB::table('activity_logs')->insert([
            'email' => $request->email,
            'activity' => 'Meminta Reset Password',
            'ip_address' => $request->ip(),
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        return response()->json([
            'message' => 'Link reset password telah dikirim',
        ]);
    }

    // TAHAP 2: Update Password Baru
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        // 1. Validasi Token & Email di database
        $resetData = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('token', $request->token)
            ->first();

        // Cek apakah token ada dan belum kadaluarsa (60 menit)
        if (!$resetData || \Carbon\Carbon::parse($resetData->created_at)->addMinutes(60)->isPast()) {
            return response()->json(['message' => 'Token tidak valid atau sudah kadaluarsa.'], 400);
        }

        // 2. Update Password User
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'User tidak ditemukan.'], 404);
        }

        /** * PENTING: Jika di Model User.php Anda SUDAH ada setPasswordAttribute (Mutator),
         * maka cukup: $user->password = $request->password; 
         * * TAPI, jika Anda ingin memastikan penggunaan BCRYPT secara manual di sini:
         */
        $user->password = Hash::make($request->password); // Laravel menggunakan Bcrypt secara default
        $user->save();

        // 3. Hapus token agar tidak bisa dipakai kembali
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        // 4. Catat AUDIT TRAIL ke activity_logs
        DB::table('activity_logs')->insert([
            'email' => $request->email,
            'activity' => 'Berhasil Melakukan Reset Password',
            'ip_address' => $request->ip(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Password berhasil diperbarui menggunakan enkripsi aman.']);
    }
}