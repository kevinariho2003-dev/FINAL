<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Consultations Table
     * 
     * Tracks all consultation requests from donors
     * - Initial consultation scheduling and completion
     - Clinician assignment
     - Communication details (phone, email, video link)
     - Status tracking
     */
    public function up(): void
    {
        Schema::create('consultations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('donor_id')->constrained('donor_profiles')->onDelete('cascade');
            $table->foreignId('clinician_id')->nullable()->constrained('users')->onDelete('set null');

            // ─────────────────────────────────────────────────
            // CONSULTATION TYPE & SCHEDULING
            // ─────────────────────────────────────────────────
            $table->enum('consultation_type', [
                'call',      // Phone consultation
                'virtual',   // Video/online consultation (Zoom, Google Meet, etc)
                'clinic',    // In-person at clinic
            ]);

            $table->dateTime('scheduled_date')->nullable();
            $table->time('scheduled_time')->nullable();
            $table->dateTime('completed_at')->nullable();

            // ─────────────────────────────────────────────────
            // CONTACT INFORMATION
            // ─────────────────────────────────────────────────
            $table->string('phone_number')->nullable(); // For 'call' type
            $table->string('email')->nullable(); // For 'virtual' type
            $table->string('clinic_location')->nullable(); // For 'clinic' type

            // ─────────────────────────────────────────────────
            // CONSULTATION COMMUNICATION
            // ─────────────────────────────────────────────────
            $table->string('video_link')->nullable(); // For virtual consultations (Zoom, Google Meet, etc)
            $table->string('meeting_code')->nullable(); // Additional code if needed
            $table->text('notes')->nullable(); // Clinician notes during/after consultation
            $table->text('donor_notes')->nullable(); // Any notes from donor

            // ─────────────────────────────────────────────────
            // STATUS & TRACKING
            // ─────────────────────────────────────────────────
            $table->enum('status', [
                'pending',      // Awaiting consultation
                'confirmed',    // Donor confirmed attendance
                'in_progress',  // Currently happening
                'completed',    // Successfully completed
                'not_done',     // Did not complete
                'cancelled',    // Cancelled
                'rescheduled',  // Rescheduled to different time
            ])->default('pending')->index();

            // ─────────────────────────────────────────────────
            // CONSULTATION OUTCOMES
            // ─────────────────────────────────────────────────
            $table->boolean('donor_eligible')->nullable(); // Clinician's initial eligibility assessment
            $table->text('clinician_observations')->nullable(); // Medical observations
            $table->text('next_steps')->nullable(); // Instructions for donor
            $table->decimal('duration_minutes', 3, 0)->nullable(); // How long the consultation took

            // ─────────────────────────────────────────────────
            // COMMUNICATION TRACKING
            // ─────────────────────────────────────────────────
            $table->boolean('reminder_sent')->default(false); // Whether reminder notification was sent
            $table->dateTime('reminder_sent_at')->nullable();
            $table->integer('reminder_count')->default(0); // How many reminders sent

            $table->timestamps();
            $table->softDeletes();

            // ─────────────────────────────────────────────────
            // INDEXES FOR PERFORMANCE
            // ─────────────────────────────────────────────────
            $table->index('donor_id');
            $table->index('clinician_id');
            // $table->index('status');
            $table->index('scheduled_date');
            $table->index('completed_at');
            $table->index(['donor_id', 'status']);
            $table->index(['donor_id', 'scheduled_date']);
            $table->index(['clinician_id', 'scheduled_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultations');
    }
};