<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL: modify the enum to add egg_retrieval
        DB::statement("ALTER TABLE appointments MODIFY COLUMN appointment_type ENUM('initial_screening','follow_up','genetic_test','egg_retrieval') NOT NULL DEFAULT 'initial_screening'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE appointments MODIFY COLUMN appointment_type ENUM('initial_screening','follow_up','genetic_test') NOT NULL DEFAULT 'initial_screening'");
    }
};
