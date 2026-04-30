<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClinicianProfile extends Model
{
    protected $fillable = [
        'user_id',
        'specialization',
        'license_number',
        'years_of_experience',
        'bio',
    ];

    protected function casts(): array
    {
        return [
            'years_of_experience' => 'integer',
        ];
    }

    // ── Relationships ──

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Recipients assigned to this clinician.
     */
    public function assignedRecipients()
    {
        return $this->hasMany(RecipientProfile::class, 'clinician_id', 'user_id');
    }
}
