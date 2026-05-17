<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DonorProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 
        'donor_code', 
        'stage',
        'approval_status',
        'stage_updated_at',
        
        // Consultation fields
        'consultation_type',
        'consultation_date',
        'consultation_time',
        'phone_number',
        'consultation_email',
        'consultation_status',
        'consultation_completed_at',
        
        // Existing fields
        'date_of_birth', 
        'blood_type', 
        'genotype',
        'height_cm', 
        'weight_kg', 
        'bmi',
        'medical_history', 
        'family_medical_history',
        'genetic_screening_status',
        'ethnicity', 
        'skin_tone', 
        'hair_color', 
        'hair_texture', 
        'eye_color',
        'education_level', 
        'occupation',
        'previous_donations', 
        'availability_status',
        'photo_path', 
        'is_anonymous',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'height_cm' => 'decimal:1',
        'weight_kg' => 'decimal:1',
        'bmi' => 'decimal:1',
        'medical_history' => 'array',
        'family_medical_history' => 'array',
        'is_anonymous' => 'boolean',
        'previous_donations' => 'integer',
        'consultation_date' => 'datetime',
        'consultation_completed_at' => 'datetime',
        'stage_updated_at' => 'datetime',
    ];

    // ────────────────────────────────────────────────────────────
    // RELATIONSHIPS
    // ────────────────────────────────────────────────────────────

    /**
     * Get the user associated with this donor profile
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all consultations for this donor
     */
    public function consultations()
    {
        return $this->hasMany(Consultation::class, 'donor_id');
    }

    /**
     * Get the latest consultation
     */
    public function latestConsultation()
    {
        return $this->hasOne(Consultation::class, 'donor_id')
                   ->latest('scheduled_date');
    }

    /**
     * Get match results
     */
    public function matches()
    {
        return $this->hasMany(MatchResult::class, 'donor_id');
    }

    /**
     * Get screening documents
     */
    public function screeningDocuments()
    {
        return $this->hasMany(ScreeningDocument::class);
    }

    /**
     * Get appointments
     */
    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    /**
     * Get donation cycles
     */
    public function donationCycles()
    {
        return $this->hasMany(DonationCycle::class, 'donor_id');
    }

    /**
     * Get payments
     */
    public function payments()
    {
        return $this->hasMany(Payment::class, 'donor_id');
    }

    // ────────────────────────────────────────────────────────────
    // SCOPES
    // ────────────────────────────────────────────────────────────

    /**
     * Get donors in profile completion stage
     */
    public function scopeInProfileStage($query)
    {
        return $query->where('stage', 'profile_completion');
    }

    /**
     * Get donors in physical appointment stage
     */
    public function scopeInPhysicalStage($query)
    {
        return $query->where('stage', 'physical_appointment');
    }

    /**
     * Get approved donors
     */
    public function scopeApproved($query)
    {
        return $query->where('approval_status', 'approved');
    }

    /**
     * Get pending donors
     */
    public function scopePending($query)
    {
        return $query->where('approval_status', 'pending');
    }

    /**
     * Get denied donors
     */
    public function scopeDenied($query)
    {
        return $query->where('approval_status', 'denied');
    }

    /**
     * Get suspended donors
     */
    public function scopeSuspended($query)
    {
        return $query->where('approval_status', 'suspended');
    }

    /**
     * Get by stage and approval status
     */
    public function scopeByStageAndStatus($query, $stage, $status)
    {
        return $query->where('stage', $stage)
                    ->where('approval_status', $status);
    }

    // ────────────────────────────────────────────────────────────
    // HELPERS & ACCESSORS
    // ────────────────────────────────────────────────────────────

    /**
     * Check if donor is available for matching
     */
    public function isAvailable(): bool
    {
        return $this->approval_status === 'approved'
            && $this->availability_status === 'available'
            && $this->stage === 'physical_appointment';
    }

    /**
     * Check if donor has completed consultation
     */
    public function hasCompletedConsultation(): bool
    {
        return $this->consultation_status === 'completed' 
            || $this->consultations()
                    ->where('status', 'completed')
                    ->exists();
    }

    /**
     * Check if donor is in a particular stage
     */
    public function isInStage($stageName): bool
    {
        return $this->stage === $stageName;
    }

    /**
     * Check if donor can proceed to next stage
     */
    public function canProceedToNextStage(): bool
    {
        return $this->approval_status === 'approved';
    }

    /**
     * Get stage label
     */
    public function getStageLabelAttribute(): string
    {
        return match($this->stage) {
            'pre_consultation' => 'Pre-Consultation',
            'signing_consents' => 'Signing Consents',
            'profile_completion' => 'Profile Completion',
            'physical_appointment' => 'Physical Appointment',
            'injection_phase' => 'Medication Phase',
            'retrieval' => 'Egg Retrieval',
            'final_payment' => 'Final Payment',
            default => 'Unknown Stage'
        };
    }

    /**
     * Get approval status label
     */
    public function getApprovalStatusLabelAttribute(): string
    {
        return match($this->approval_status) {
            'pending' => 'Pending Review',
            'approved' => 'Approved',
            'denied' => 'Denied',
            'suspended' => 'Suspended',
            default => 'Unknown'
        };
    }

    /**
     * Get percentage through workflow (for progress tracking)
     */
    public function getWorkflowProgressAttribute(): int
    {
        $stages = [
            'pre_consultation' => 10,
            'signing_consents' => 20,
            'profile_completion' => 30,
            'physical_appointment' => 50,
            'injection_phase' => 70,
            'retrieval' => 85,
            'final_payment' => 100,
        ];

        return $stages[$this->stage] ?? 0;
    }

    /**
     * Get next stage name
     */
    public function getNextStageAttribute(): ?string
    {
        $stageProgression = [
            'pre_consultation' => 'signing_consents',
            'signing_consents' => 'profile_completion',
            'profile_completion' => 'physical_appointment',
            'physical_appointment' => 'injection_phase',
            'injection_phase' => 'retrieval',
            'retrieval' => 'final_payment',
            'final_payment' => null,
        ];

        return $stageProgression[$this->stage] ?? null;
    }

    // ────────────────────────────────────────────────────────────
    // ACTIONS
    // ────────────────────────────────────────────────────────────

    /**
     * Mark consultation as completed
     */
    public function completeConsultation()
    {
        return $this->update([
            'stage' => 'signing_consents',
            'approval_status' => 'pending',
            'consultation_status' => 'completed',
            'consultation_completed_at' => now(),
            'stage_updated_at' => now(),
        ]);
    }

    /**
     * Approve donor to move to next stage
     */
    public function approve()
    {
        return $this->update([
            'approval_status' => 'approved',
            'stage_updated_at' => now(),
        ]);
    }

    /**
     * Deny donor application
     */
    public function deny()
    {
        return $this->update([
            'approval_status' => 'denied',
            'stage_updated_at' => now(),
        ]);
    }

    /**
     * Suspend donor account
     */
    public function suspend()
    {
        return $this->update([
            'approval_status' => 'suspended',
            'stage_updated_at' => now(),
        ]);
    }

    /**
     * Reactivate suspended donor
     */
    public function reactivate()
    {
        return $this->update([
            'approval_status' => 'approved',
            'stage_updated_at' => now(),
        ]);
    }

    // ────────────────────────────────────────────────────────────
    // UTILITIES
    // ────────────────────────────────────────────────────────────

    /**
     * Generate a unique donor code like DN-000123
     */
    public static function generateCode(): string
    {
        $last = self::max('id') ?? 0;
        return 'DN-' . str_pad($last + 1, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Get donor status summary for dashboard
     */
    public function getStatusSummary(): array
    {
        return [
            'donor_code' => $this->donor_code,
            'stage' => $this->stage,
            'stage_label' => $this->stage_label,
            'approval_status' => $this->approval_status,
            'approval_status_label' => $this->approval_status_label,
            'progress' => $this->workflow_progress,
            'can_proceed' => $this->canProceedToNextStage(),
            'next_stage' => $this->next_stage,
            'consultation_completed' => $this->hasCompletedConsultation(),
            'available' => $this->isAvailable(),
        ];
    }
}