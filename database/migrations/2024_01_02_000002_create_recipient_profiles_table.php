<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recipient_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('recipient_code')->unique();
            $table->enum('status', ['active', 'matched', 'inactive'])->default('active');

            // Medical context
            $table->text('diagnosis')->nullable();
            $table->text('treatment_history')->nullable();

            // Donor preferences
            $table->string('preferred_blood_type', 5)->nullable();
            $table->string('preferred_genotype', 5)->nullable();
            $table->string('preferred_ethnicity')->nullable();
            $table->string('preferred_skin_tone')->nullable();
            $table->string('preferred_hair_color')->nullable();
            $table->string('preferred_eye_color')->nullable();
            $table->integer('preferred_age_min')->nullable();
            $table->integer('preferred_age_max')->nullable();
            $table->string('preferred_education_level')->nullable();
            $table->integer('max_previous_donations')->nullable();

            // Management
            $table->enum('priority_level', ['normal', 'urgent'])->default('normal');
            $table->foreignId('clinician_id')->nullable()->constrained('users')->onDelete('set null');
            $table->boolean('is_international')->default(false);

            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recipient_profiles');
    }
};
