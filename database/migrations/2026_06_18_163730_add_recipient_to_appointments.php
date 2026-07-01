<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('donor_profile_id')->nullable()->change();
            $table->foreignId('recipient_profile_id')->nullable()->after('donor_profile_id')->constrained('recipient_profiles')->onDelete('cascade');
        });

        // Update the enum to include 'embryo_transfer'
        DB::statement("ALTER TABLE appointments MODIFY appointment_type ENUM('initial_screening', 'follow_up', 'genetic_test', 'egg_retrieval', 'embryo_transfer') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['recipient_profile_id']);
            $table->dropColumn('recipient_profile_id');
            $table->foreignId('donor_profile_id')->nullable(false)->change();
        });
    }
};
