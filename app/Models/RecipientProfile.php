<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RecipientProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'recipient_code', 'status',
        'diagnosis', 'treatment_history',
        'preferred_blood_type', 'preferred_genotype',
        'preferred_ethnicity', 'preferred_skin_tone',
        'preferred_hair_color', 'preferred_eye_color',
        'preferred_age_min', 'preferred_age_max',
        'preferred_education_level', 'max_previous_donations',
        'priority_level', 'clinician_id', 'is_international',
    ];

    protected function casts(): array
    {
        return [
            'preferred_age_min' => 'integer',
            'preferred_age_max' => 'integer',
            'max_previous_donations' => 'integer',
            'is_international' => 'boolean',
        ];
    }

    // ── Relationships ──

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function clinician()
    {
        return $this->belongsTo(User::class, 'clinician_id');
    }

    public function matches()
    {
        return $this->hasMany(MatchResult::class, 'recipient_id');
    }

    public function donationCycles()
    {
        return $this->hasMany(DonationCycle::class, 'recipient_id');
    }

    /**
     * Generate a unique recipient code like RC-000045
     */
    public static function generateCode(): string
    {
        $last = self::max('id') ?? 0;
        return 'RC-' . str_pad($last + 1, 6, '0', STR_PAD_LEFT);
    }
}
