<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matching_criteria_weights', function (Blueprint $table) {
            $table->id();
            $table->string('criterion_name')->unique(); // e.g. 'blood_type', 'ethnicity'
            $table->decimal('weight', 3, 2)->default(0.50); // 0.00 – 1.00
            $table->boolean('is_hard_filter')->default(false);
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matching_criteria_weights');
    }
};
