<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add ER-diagram fields (screening_date, test_results) to the
     * existing screening_documents table for alignment with the
     * Medical Screenings entity in the finalized ER diagram.
     */
    public function up(): void
    {
        Schema::table('screening_documents', function (Blueprint $table) {
            $table->date('screening_date')->nullable()->after('donor_profile_id');
            $table->json('test_results')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('screening_documents', function (Blueprint $table) {
            $table->dropColumn(['screening_date', 'test_results']);
        });
    }
};
