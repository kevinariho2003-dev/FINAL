<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cycle_id')->constrained('donation_cycles')->onDelete('cascade');
            $table->string('drug_name');
            $table->string('dosage');
            $table->string('frequency');
            $table->string('duration');
            $table->timestamps();

            $table->index('cycle_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medications');
    }
};
