<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Hash; // Tambahkan ini

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $primaryKey = 'id_user'; // Pastikan Primary Key Anda benar
    protected $table = 'user';

    protected $fillable = [
        'name',
        'email', // Username diganti email
        'password',
        'role',
        'is_active',
        'activation_token',
        'token_expires_at',
    ];

    protected $hidden = [
        'password',
        'activation_token', // Sembunyikan token dari serialisasi JSON
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'token_expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];
    
    
}