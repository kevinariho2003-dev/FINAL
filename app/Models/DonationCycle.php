<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DonationCycle extends Model
{
    protected $fillable = [
        'donor_id',
        'recipient_id',
        'start_date',
        'end_date',
        'eggs_retrieved',
        'outcome',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'eggs_retrieved' => 'integer',
        ];
    }

    // ── Relationships ──

    public function donor()
    {
        return $this->belongsTo(DonorProfile::class, 'donor_id');
    }

    public function recipient()
    {
        return $this->belongsTo(RecipientProfile::class, 'recipient_id');
    }

    public function medications()
    {
        return $this->hasMany(Medication::class, 'cycle_id');
    }

    public function payment()
    {
        return $this->hasOne(Payment::class, 'cycle_id');
    }

    // ── Helpers ──

    public function isActive(): bool
    {
        return $this->outcome === 'pending';
    }

    public function isCompleted(): bool
    {
        return in_array($this->outcome, ['successful', 'unsuccessful']);
    }
}
