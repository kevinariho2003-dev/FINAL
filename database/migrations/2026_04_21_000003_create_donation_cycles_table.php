<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('donation_cycles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('donor_id')->constrained('donor_profiles')->onDelete('cascade');
            $table->foreignId('recipient_id')->constrained('recipient_profiles')->onDelete('cascade');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->integer('eggs_retrieved')->nullable();
            $table->enum('outcome', ['pending', 'successful', 'unsuccessful', 'cancelled'])->default('pending');
            $table->timestamps();

            $table->index(['donor_id', 'recipient_id']);
            $table->index('outcome');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donation_cycles');
    }
};
