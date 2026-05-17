<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('donor_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('donor_code')->unique();

            // ─────────────────────────────────────────────────
            // WORKFLOW STAGE & APPROVAL STATUS (NEW)
            // ─────────────────────────────────────────────────
            $table->enum('stage', [
                'pre_consultation',      // Stage 1: Before consultation
                'signing_consents',      // Stage 2: Consent forms
                'profile_completion',    // Stage 3: Profile/questionnaire
                'physical_appointment',  // Stage 4: Physical appointment
                'injection_phase',       // Stage 5+: Medical phases
                'retrieval',             // Egg retrieval
                'final_payment',         // Final compensation
            ])->default('pre_consultation')->index();

            $table->enum('approval_status', [
                'pending',      // Awaiting review
                'approved',     // Approved to move forward
                'denied',       // Application denied
                'suspended',    // Temporarily suspended
            ])->default('pending')->index();

            $table->timestamp('stage_updated_at')->nullable();

            // ─────────────────────────────────────────────────
            // CONSULTATION FIELDS (NEW)
            // ─────────────────────────────────────────────────
            $table->enum('consultation_type', [
                'call',      // Phone consultation
                'virtual',   // Video/online consultation
                'clinic',    // In-person at clinic
            ])->nullable();

            $table->dateTime('consultation_date')->nullable();
            $table->time('consultation_time')->nullable();
            $table->string('phone_number')->nullable(); // For 'call' type consultations
            $table->string('consultation_email')->nullable(); // For 'virtual' consultations

            $table->enum('consultation_status', [
                'pending',     // Awaiting consultation
                'completed',   // Consultation completed successfully
                'not_done',    // Consultation marked as not done
            ])->default('pending')->index();

            $table->timestamp('consultation_completed_at')->nullable();

            // ─────────────────────────────────────────────────
            // MEDICAL INFORMATION
            // ─────────────────────────────────────────────────
            $table->date('date_of_birth');
            $table->string('blood_type', 5)->nullable();
            $table->string('genotype', 5)->nullable();
            $table->decimal('height_cm', 5, 1)->nullable();
            $table->decimal('weight_kg', 5, 1)->nullable();
            $table->decimal('bmi', 4, 1)->nullable();
            $table->json('medical_history')->nullable();
            $table->json('family_medical_history')->nullable();
            $table->enum('genetic_screening_status', ['pending', 'clear', 'flagged'])->default('pending')->index();

            // ─────────────────────────────────────────────────
            // PHENOTYPIC (PHYSICAL TRAITS)
            // ─────────────────────────────────────────────────
            $table->string('ethnicity')->nullable();
            $table->string('skin_tone')->nullable();
            $table->string('hair_color')->nullable();
            $table->string('hair_texture')->nullable();
            $table->string('eye_color')->nullable();

            // ─────────────────────────────────────────────────
            // DEMOGRAPHIC INFORMATION
            // ─────────────────────────────────────────────────
            $table->string('education_level')->nullable();
            $table->string('occupation')->nullable();

            // ─────────────────────────────────────────────────
            // DONATION & AVAILABILITY
            // ─────────────────────────────────────────────────
            $table->integer('previous_donations')->default(0);
            $table->enum('availability_status', ['available', 'unavailable', 'on_cycle'])->default('available')->index();

            // ─────────────────────────────────────────────────
            // PRIVACY & PROFILE
            // ─────────────────────────────────────────────────
            $table->string('photo_path')->nullable();
            $table->boolean('is_anonymous')->default(true);

            $table->timestamps();
            $table->softDeletes();

            // ─────────────────────────────────────────────────
            // INDEXES FOR PERFORMANCE
            // ─────────────────────────────────────────────────
            // $table->index('stage');
            // $table->index('approval_status');
            // $table->index('consultation_status');
            $table->index('blood_type');
            // $table->index('availability_status');
            $table->index('user_id');
            $table->index(['stage', 'approval_status']);
            $table->index(['donor_code', 'stage']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donor_profiles');
    }
};