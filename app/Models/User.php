<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'email_verified_at',
        'avatar',
        'phone',
        'date_of_birth',
        'role',
        'password',
        'is_active',
        'google_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'date_of_birth' => 'date',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    protected $appends = ['avatar_url'];

    public function getAvatarUrlAttribute()
    {
        if ($this->avatar) {
            return asset('storage/' . $this->avatar);
        }
        return null; // The frontend will handle default avatars
    }

    // ── Relationships ──

    public function adminProfile()
    {
        return $this->hasOne(AdminProfile::class);
    }

    public function clinicianProfile()
    {
        return $this->hasOne(ClinicianProfile::class);
    }

    public function donorProfile()
    {
        return $this->hasOne(DonorProfile::class);
    }

    public function recipientProfile()
    {
        return $this->hasOne(RecipientProfile::class);
    }

    public function questionnaireResponses()
    {
        return $this->hasMany(DonorQuestionnaireResponse::class);
    }

    public function consents()
    {
        return $this->hasMany(Consent::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    // ── Helpers ──

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isClinician(): bool
    {
        return $this->role === 'clinician';
    }

    public function isDonor(): bool
    {
        return $this->role === 'donor';
    }

    public function isRecipient(): bool
    {
        return $this->role === 'recipient';
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
