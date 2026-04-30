<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recipient_id')->constrained('recipient_profiles')->onDelete('cascade');
            $table->foreignId('donor_id')->constrained('donor_profiles')->onDelete('cascade');
            $table->decimal('match_score', 5, 2)->default(0);
            $table->json('score_breakdown')->nullable();
            $table->boolean('hard_filter_passed')->default(true);
            $table->enum('status', ['proposed', 'clinician_review', 'approved', 'rejected', 'completed'])->default('proposed');
            $table->enum('matched_by', ['system', 'manual'])->default('system');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('review_notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index(['recipient_id', 'donor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};
