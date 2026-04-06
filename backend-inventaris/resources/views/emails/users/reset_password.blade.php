<x-mail::message>
# Permintaan Reset Password

Halo,

Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda di **Sistem Inventaris**. Jika Anda tidak merasa melakukan permintaan ini, abaikan saja email ini.

<x-mail::button :url="$resetLink">
Atur Ulang Password
</x-mail::button>

Tautan ini akan kedaluwarsa dalam **60 menit**.

Jika Anda kesulitan mengklik tombol "Atur Ulang Password", salin dan tempel URL di bawah ini ke browser Anda:
[{{ $resetLink }}]({{ $resetLink }})

Terima kasih,<br>
{{ config('app.name') }}
</x-mail::message>