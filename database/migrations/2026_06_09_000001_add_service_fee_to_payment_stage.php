<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE payments MODIFY COLUMN payment_stage ENUM('initial','final','service_fee') NOT NULL DEFAULT 'initial'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE payments MODIFY COLUMN payment_stage ENUM('initial','final') NOT NULL DEFAULT 'initial'");
    }
};
