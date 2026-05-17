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
        // 1. Update the column using Blueprint instead of Raw SQL
        Schema::table('recipient_profiles', function (Blueprint $table) {
            $table->enum('status', ['active', 'matched', 'inactive', 'pending', 'approved', 'suspended'])
                  ->default('pending')
                  ->change();
        });

        // 2. Convert existing 'active' entries to 'pending'
        DB::table('recipient_profiles')
            ->where('status', 'active')
            ->update(['status' => 'pending']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Revert data changes
        DB::table('recipient_profiles')
            ->where('status', 'pending')
            ->update(['status' => 'active']);

        DB::table('recipient_profiles')
            ->where('status', 'approved')
            ->update(['status' => 'active']);

        DB::table('recipient_profiles')
            ->where('status', 'suspended')
            ->update(['status' => 'inactive']);

        // 2. Revert the column definition
        Schema::table('recipient_profiles', function (Blueprint $table) {
            $table->enum('status', ['active', 'matched', 'inactive'])
                  ->default('active')
                  ->change();
        });
    }
};
