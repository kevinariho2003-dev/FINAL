<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('donor_questionnaire_phases', function (Blueprint $table) {
            $table->id();
            $table->string('phase_key')->unique(); // 'biodata', 'fertility_history', 'medical_info', 'physical_characteristics', 'lifestyle'
            $table->string('phase_name');
            $table->text('description')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_required')->default(true);
            $table->json('validation_rules')->nullable(); // Store validation rules as JSON
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('donor_questionnaire_phases');
    }
};
