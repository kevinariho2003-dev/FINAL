<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScreeningDocument extends Model
{
    protected $fillable = [
        'donor_profile_id',
        'screening_date',
        'document_type',
        'file_path',
        'original_filename',
        'notes',
        'test_results',
        'status',
        'review_notes',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'screening_date' => 'date',
        'test_results' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function donorProfile()
    {
        return $this->belongsTo(DonorProfile::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
