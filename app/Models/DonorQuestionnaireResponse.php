<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DonorQuestionnaireResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'phase_id',
        'responses',
        'status',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'responses' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function phase()
    {
        return $this->belongsTo(DonorQuestionnairePhase::class, 'phase_id');
    }

    // Scopes
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeSubmitted($query)
    {
        return $query->where('status', 'submitted');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    // Helpers
    public function isCompleted(): bool
    {
        return $this->status === 'completed' || $this->status === 'submitted';
    }

    public function markAsCompleted()
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    public function markAsSubmitted()
    {
        $this->update([
            'status' => 'submitted',
            'completed_at' => now(),
        ]);
    }
}
