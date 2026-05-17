<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Consultation extends Model
{
    use HasFactory;

    protected $fillable = [
        'donor_id',
        'clinician_id',
        'consultation_type',
        'scheduled_date',
        'scheduled_time',
        'completed_at',
        'phone_number',
        'email',
        'video_link',
        'meeting_code',
        'notes',
        'donor_notes',
        'status',
        'donor_eligible',
        'clinician_observations',
        'duration_minutes',
        'reminder_sent',
        'reminder_sent_at',
        'reminder_count',
    ];

    protected $casts = [
        'scheduled_date' => 'datetime',
        'completed_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
        'donor_eligible' => 'boolean',
        'reminder_sent' => 'boolean',
        'reminder_count' => 'integer',
        'duration_minutes' => 'integer',
    ];

    // ────────────────────────────────────────────────────────────
    // RELATIONSHIPS
    // ────────────────────────────────────────────────────────────

    /**
     * Get the donor for this consultation
     */
    public function donor()
    {
        return $this->belongsTo(DonorProfile::class, 'donor_id');
    }

    /**
     * Get the clinician who handled this consultation
     */
    public function clinician()
    {
        return $this->belongsTo(User::class, 'clinician_id');
    }

    /**
     * Get the donor's user (for notifications)
     */
    public function donorUser()
    {
        return $this->hasOneThrough(User::class, DonorProfile::class, 'id', 'id', 'donor_id', 'user_id');
    }

    // ────────────────────────────────────────────────────────────
    // SCOPES (for queries)
    // ────────────────────────────────────────────────────────────

    /**
     * Get pending consultations (awaiting completion)
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Get completed consultations
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Get consultations by clinician
     */
    public function scopeForClinician($query, $clinicianId)
    {
        return $query->where('clinician_id', $clinicianId);
    }

    /**
     * Get consultations for a specific date range
     */
    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('scheduled_date', [$startDate, $endDate]);
    }

    /**
     * Get upcoming consultations (not yet completed)
     */
    public function scopeUpcoming($query)
    {
        return $query->where('status', 'pending')
                    ->where('scheduled_date', '>=', now());
    }

    /**
     * Get overdue consultations (past scheduled date, not completed)
     */
    public function scopeOverdue($query)
    {
        return $query->where('status', 'pending')
                    ->where('scheduled_date', '<', now());
    }

    /**
     * Get consultations by type
     */
    public function scopeByType($query, $type)
    {
        return $query->where('consultation_type', $type);
    }

    // ────────────────────────────────────────────────────────────
    // HELPERS & ACCESSORS
    // ────────────────────────────────────────────────────────────

    /**
     * Check if consultation is overdue
     */
    public function isOverdue(): bool
    {
        return $this->status === 'pending' && $this->scheduled_date < now();
    }

    /**
     * Check if consultation is upcoming
     */
    public function isUpcoming(): bool
    {
        return $this->status === 'pending' && $this->scheduled_date >= now();
    }

    /**
     * Get contact info based on consultation type
     */
    public function getContactInfo(): ?string
    {
        return match($this->consultation_type) {
            'call' => $this->phone_number,
            'virtual' => $this->email,
            'clinic' => $this->clinic_location,
            default => null
        };
    }

    /**
     * Get formatted scheduled date and time
     */
    public function getScheduledAtAttribute()
    {
        if ($this->scheduled_date && $this->scheduled_time) {
            return $this->scheduled_date->format('Y-m-d') . ' ' . $this->scheduled_time;
        }
        return $this->scheduled_date?->format('Y-m-d H:i');
    }

    /**
     * Get consultation type label
     */
    public function getTypeLabel(): string
    {
        return match($this->consultation_type) {
            'call' => '📞 Phone Call',
            'virtual' => '🎥 Video Call',
            'clinic' => '🏥 In-Person at Clinic',
            default => 'Unknown'
        };
    }

    /**
     * Get status label with emoji
     */
    public function getStatusLabel(): string
    {
        return match($this->status) {
            'pending' => '⏳ Pending',
            'confirmed' => '✓ Confirmed',
            'in_progress' => '🔄 In Progress',
            'completed' => '✅ Completed',
            'not_done' => '❌ Not Done',
            'cancelled' => '🚫 Cancelled',
            'rescheduled' => '📅 Rescheduled',
            default => 'Unknown'
        };
    }

    /**
     * Mark consultation as completed
     */
    public function markCompleted(array $data = [])
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
            'clinician_observations' => $data['observations'] ?? null,
            'donor_eligible' => $data['donor_eligible'] ?? null,
            'next_steps' => $data['next_steps'] ?? null,
            'duration_minutes' => $data['duration_minutes'] ?? null,
        ]);

        // Update donor profile to move them to next stage
        $this->donor->update([
            'stage' => 'signing_consents',
            'approval_status' => 'pending',
            'consultation_status' => 'completed',
            'consultation_completed_at' => now(),
        ]);

        return $this;
    }

    /**
     * Mark consultation as not done
     */
    public function markNotDone(string $reason = null)
    {
        $this->update([
            'status' => 'not_done',
            'notes' => $reason,
            'completed_at' => now(),
        ]);

        return $this;
    }

    /**
     * Send reminder to donor
     */
    public function sendReminder()
    {
        // Send notification to donor
        $donor = $this->donor->user;
        
        // Log reminder
        $this->increment('reminder_count');
        $this->update(['reminder_sent_at' => now(), 'reminder_sent' => true]);

        // You can integrate your notification service here
        // Example: Notification::send($donor, new ConsultationReminderNotification($this));

        return $this;
    }
}
