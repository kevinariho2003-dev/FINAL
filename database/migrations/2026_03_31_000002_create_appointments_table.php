<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('donor_profile_id')->constrained('donor_profiles')->onDelete('cascade');
            $table->enum('appointment_type', ['initial_screening', 'follow_up', 'genetic_test'])->default('initial_screening');
            $table->date('preferred_date');
            $table->enum('preferred_time_slot', ['morning', 'afternoon', 'evening'])->default('morning');
            $table->enum('status', ['requested', 'confirmed', 'completed', 'cancelled'])->default('requested');
            $table->text('clinic_notes')->nullable();
            $table->text('donor_notes')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->index('donor_profile_id');
            $table->index('status');
            $table->index('preferred_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
