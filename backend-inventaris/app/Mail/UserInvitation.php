<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserInvitation extends Mailable
{
    use Queueable, SerializesModels;

    // Properti publik yang akan tersedia di template Blade
    public $user;
    public $activationUrl;

    /**
     * Buat instance pesan baru.
     * @param object $user Objek user yang baru dibuat
     * @param string $activationUrl URL aktivasi lengkap dengan token
     */
    public function __construct($user, $activationUrl)
    {
        $this->user = $user;
        $this->activationUrl = $activationUrl;
    }

    /**
     * Dapatkan amplop pesan (Subject/Subjek).
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Selamat Datang! Aktivasi Akun Anda di Sistem Inventaris',
            // Gunakan email pengguna sebagai penerima
            to: $this->user->email, 
        );
    }

    /**
     * Dapatkan definisi konten pesan.
     */
    public function content(): Content
    {
        return new Content(
            // Merujuk ke template Markdown Blade
            markdown: 'emails.users.invitiation', 
        );
    }
}