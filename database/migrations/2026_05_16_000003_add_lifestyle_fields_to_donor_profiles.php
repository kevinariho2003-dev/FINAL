<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donor_profiles', function (Blueprint $table) {
            // Phase 2: Reproductive History
            $table->integer('previous_pregnancies')->default(0)->after('previous_donations');
            $table->enum('menstrual_regularity', ['regular', 'irregular', 'absent'])->nullable()->after('previous_pregnancies');

            // Phase 5: Lifestyle / Social
            $table->enum('smoking_status', ['never', 'former', 'current'])->default('never')->after('occupation');
            $table->enum('alcohol_use', ['none', 'occasional', 'moderate', 'heavy'])->default('none')->after('smoking_status');
            $table->enum('exercise_level', ['sedentary', 'light', 'moderate', 'active', 'very_active'])->default('moderate')->after('alcohol_use');
        });
    }

    public function down(): void
    {
        Schema::table('donor_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'previous_pregnancies',
                'menstrual_regularity',
                'smoking_status',
                'alcohol_use',
                'exercise_level',
            ]);
        });
    }
};
