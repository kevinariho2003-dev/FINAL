<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DonorProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'donor_code', 'status',
        'date_of_birth', 'blood_type', 'genotype',
        'height_cm', 'weight_kg', 'bmi',
        'medical_history', 'family_medical_history',
        'genetic_screening_status',
        'ethnicity', 'skin_tone', 'hair_color', 'hair_texture', 'eye_color',
        'education_level', 'occupation',
        'previous_donations', 'availability_status',
        'photo_path', 'is_anonymous',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'height_cm' => 'decimal:1',
            'weight_kg' => 'decimal:1',
            'bmi' => 'decimal:1',
            'medical_history' => 'array',
            'family_medical_history' => 'array',
            'is_anonymous' => 'boolean',
            'previous_donations' => 'integer',
        ];
    }

    // ── Relationships ──

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function matches()
    {
        return $this->hasMany(MatchResult::class, 'donor_id');
    }

    public function screeningDocuments()
    {
        return $this->hasMany(ScreeningDocument::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function donationCycles()
    {
        return $this->hasMany(DonationCycle::class, 'donor_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'donor_id');
    }

    // ── Helpers ──

    public function isAvailable(): bool
    {
        return $this->status === 'approved'
            && $this->availability_status === 'available';
    }

    /**
     * Generate a unique donor code like DN-000123
     */
    public static function generateCode(): string
    {
        $last = self::max('id') ?? 0;
        return 'DN-' . str_pad($last + 1, 6, '0', STR_PAD_LEFT);
    }
}
