<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DonorQuestionnairePhase extends Model
{
    use HasFactory;

    protected $fillable = [
        'phase_key',
        'phase_name',
        'description',
        'order',
        'is_required',
        'validation_rules',
    ];

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'validation_rules' => 'array',
            'order' => 'integer',
        ];
    }

    // Relationships
    public function responses()
    {
        return $this->hasMany(DonorQuestionnaireResponse::class, 'phase_id');
    }

    // Scopes
    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }

    public function scopeRequired($query)
    {
        return $query->where('is_required', true);
    }
}
