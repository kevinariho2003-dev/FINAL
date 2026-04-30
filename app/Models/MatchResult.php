<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MatchResult extends Model
{
    protected $table = 'matches';

    protected $fillable = [
        'recipient_id', 'donor_id',
        'match_score', 'score_breakdown',
        'hard_filter_passed', 'status', 'matched_by',
        'reviewed_by', 'review_notes', 'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'match_score' => 'decimal:2',
            'score_breakdown' => 'array',
            'hard_filter_passed' => 'boolean',
            'reviewed_at' => 'datetime',
        ];
    }

    // ── Relationships ──

    public function recipient()
    {
        return $this->belongsTo(RecipientProfile::class, 'recipient_id');
    }

    public function donor()
    {
        return $this->belongsTo(DonorProfile::class, 'donor_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
