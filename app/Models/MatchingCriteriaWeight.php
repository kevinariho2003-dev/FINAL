<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MatchingCriteriaWeight extends Model
{
    protected $fillable = [
        'criterion_name', 'weight',
        'is_hard_filter', 'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'weight' => 'decimal:2',
            'is_hard_filter' => 'boolean',
        ];
    }

    public function updatedByUser()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
