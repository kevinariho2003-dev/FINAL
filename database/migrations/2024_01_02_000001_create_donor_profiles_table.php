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
            $table->enum('status', ['pending', 'approved', 'suspended', 'inactive'])->default('pending');

            // Medical
            $table->date('date_of_birth');
            $table->string('blood_type', 5)->nullable();
            $table->string('genotype', 5)->nullable();
            $table->decimal('height_cm', 5, 1)->nullable();
            $table->decimal('weight_kg', 5, 1)->nullable();
            $table->decimal('bmi', 4, 1)->nullable();
            $table->json('medical_history')->nullable();
            $table->json('family_medical_history')->nullable();
            $table->enum('genetic_screening_status', ['pending', 'clear', 'flagged'])->default('pending');

            // Phenotypic
            $table->string('ethnicity')->nullable();
            $table->string('skin_tone')->nullable();
            $table->string('hair_color')->nullable();
            $table->string('hair_texture')->nullable();
            $table->string('eye_color')->nullable();

            // Demographic
            $table->string('education_level')->nullable();
            $table->string('occupation')->nullable();

            // Donation
            $table->integer('previous_donations')->default(0);
            $table->enum('availability_status', ['available', 'unavailable', 'on_cycle'])->default('available');

            // Privacy
            $table->string('photo_path')->nullable();
            $table->boolean('is_anonymous')->default(true);

            $table->timestamps();

            $table->index('status');
            $table->index('availability_status');
            $table->index('blood_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donor_profiles');
    }
};
