<?php

namespace App\Http\Controllers;

use App\Models\Medication;
use App\Models\DonorProfile;
use Illuminate\Http\Request;

class MedicationController extends Controller
{
    public function getDonorMedications(Request $request)
    {
        $user = $request->user();

        // Ensure we find the donor profile associated with the logged-in user
        $donor = DonorProfile::where('user_id', $user->id)->first();

        if (!$donor) {
            return response()->json(['message' => 'Donor profile not found.'], 404);
        }

        // Fetch medications linked to the donor's active cycles
        $medications = Medication::whereHas('donationCycle', function ($query) use ($donor) {
            $query->where('donor_id', $donor->id);
        })
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function ($med) {
            return [
                'id' => $med->id,
                'name' => $med->drug_name,
                'type' => 'Injectable/Oral', // You can add a 'type' column to your DB if needed
                'dosage' => $med->dosage,
                'start_date' => $med->created_at->format('Y-m-d'),
                'frequency' => $med->frequency,
                'instructions' => $med->duration, // Mapping duration/notes to instructions
            ];
        });

        return response()->json($medications);
    }
}