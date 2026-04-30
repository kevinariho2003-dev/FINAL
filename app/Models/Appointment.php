<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    protected $fillable = [
        'donor_profile_id',
        'appointment_type',
        'preferred_date',
        'preferred_time_slot',
        'status',
        'clinic_notes',
        'donor_notes',
        'confirmed_by',
        'confirmed_at',
    ];

    protected $casts = [
        'preferred_date' => 'date',
        'confirmed_at' => 'datetime',
    ];

    public function donorProfile()
    {
        return $this->belongsTo(DonorProfile::class);
    }

    public function confirmer()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
