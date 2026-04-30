<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Change the enum to include all needed statuses
        DB::statement("ALTER TABLE recipient_profiles MODIFY COLUMN status ENUM('active', 'matched', 'inactive', 'pending', 'approved', 'suspended') DEFAULT 'pending'");

        // Convert existing 'active' entries to 'pending' so clinician can approve them
        DB::table('recipient_profiles')
            ->where('status', 'active')
            ->update(['status' => 'pending']);
    }

    public function down(): void
    {
        DB::table('recipient_profiles')
            ->where('status', 'pending')
            ->update(['status' => 'active']);

        DB::table('recipient_profiles')
            ->where('status', 'approved')
            ->update(['status' => 'active']);

        DB::table('recipient_profiles')
            ->where('status', 'suspended')
            ->update(['status' => 'inactive']);

        DB::statement("ALTER TABLE recipient_profiles MODIFY COLUMN status ENUM('active', 'matched', 'inactive') DEFAULT 'active'");
    }
};
