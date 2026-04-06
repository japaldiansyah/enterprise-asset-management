<x-mail::message>
# Undangan Aktivasi Akun

Halo,

Akun Anda di **Sistem Inventaris {{ config('app.name') }}** telah dibuat. Untuk menyelesaikan pendaftaran, silakan buat password rahasia Anda melalui tautan di bawah ini.

**Detail Akun Anda:**
* **Email:** {{ $user->email }}
* **Role:** {{ $user->role }}
* **Tenggat Waktu:** Tautan ini akan kadaluarsa dalam 24 jam.

<x-mail::button :url="$activationUrl">
AKTIVASI AKUN & BUAT PASSWORD
</x-mail::button>

Jika Anda mengalami kesulitan, harap hubungi Administrator sistem.

Terima kasih,
<br>
Tim Administrasi Sistem Inventaris
</x-mail::message>