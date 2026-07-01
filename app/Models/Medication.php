<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Medication extends Model
{
    protected $fillable = [
        'cycle_id',
        'target_patient',
        'drug_name',
        'dosage',
        'frequency',
        'duration',
    ];

    // ── Relationships ──

    public function donationCycle()
    {
        return $this->belongsTo(DonationCycle::class, 'cycle_id');
    }
}
