<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\DonorProfile;
use App\Models\Consultation;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get all donors who have pending consultations (status = 'pending' and consultation_date is not null)
        $donors = DonorProfile::where('consultation_status', 'pending')
            ->whereNotNull('consultation_date')
            ->get();
        
        foreach ($donors as $donor) {
            // Check if consultation already exists
            $exists = Consultation::where('donor_id', $donor->id)->exists();
            
            if (!$exists) {
                Consultation::create([
                    'donor_id' => $donor->id,
                    'consultation_type' => $donor->consultation_type ?? 'call',
                    'scheduled_date' => $donor->consultation_date ?? now(),
                    'scheduled_time' => $donor->consultation_time ?? '09:00:00',
                    'status' => $donor->consultation_status ?? 'pending',
                    'phone_number' => $donor->phone_number,
                    'email' => $donor->consultation_email, // Note: using consultation_email
                    'donor_notes' => 'Migrated from donor profile',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                
                echo "Migrated consultation for donor ID: " . $donor->id . "\n";
            }
        }
        
        echo "Migration complete! Migrated " . $donors->count() . " consultations.\n";
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Delete migrated consultations
        Consultation::where('donor_notes', 'Migrated from donor profile')->delete();
    }
};
