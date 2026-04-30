<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'donor_id',
        'cycle_id',
        'amount',
        'payment_date',
        'payment_status',
        'payment_method',
        'reference_number',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_date' => 'date',
        ];
    }

    // ── Relationships ──

    public function donor()
    {
        return $this->belongsTo(DonorProfile::class, 'donor_id');
    }

    public function donationCycle()
    {
        return $this->belongsTo(DonationCycle::class, 'cycle_id');
    }

    // ── Helpers ──

    /**
     * Generate a unique payment reference like PAY-20260421-000123.
     */
    public static function generateReference(): string
    {
        $date = now()->format('Ymd');
        $last = self::max('id') ?? 0;
        return 'PAY-' . $date . '-' . str_pad($last + 1, 6, '0', STR_PAD_LEFT);
    }
}
