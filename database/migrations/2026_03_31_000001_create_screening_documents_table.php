<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('screening_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('donor_profile_id')->constrained('donor_profiles')->onDelete('cascade');
            $table->enum('document_type', ['medical_report', 'genetic_screening', 'blood_test', 'other'])->default('medical_report');
            $table->string('file_path');
            $table->string('original_filename');
            $table->text('notes')->nullable();
            $table->enum('status', ['pending_review', 'verified', 'rejected'])->default('pending_review');
            $table->text('review_notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index('donor_profile_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('screening_documents');
    }
};
