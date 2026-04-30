<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('donor_id')->constrained('donor_profiles')->onDelete('cascade');
            $table->foreignId('cycle_id')->constrained('donation_cycles')->onDelete('cascade');
            $table->decimal('amount', 10, 2);
            $table->date('payment_date')->nullable();
            $table->enum('payment_status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->enum('payment_method', ['bank_transfer', 'mobile_money', 'cash', 'cheque'])->default('bank_transfer');
            $table->string('reference_number')->unique()->nullable();
            $table->timestamps();

            $table->index('cycle_id');
            $table->index('payment_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
