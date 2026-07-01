<?php

namespace App\Http\Controllers;

use App\Models\DonorProfile;
use App\Models\Appointment;
use App\Models\MatchResult;
use Illuminate\Http\Request;

class ClinicianActionController extends Controller
{
    /**
     * Retrieve a unified list of actionable items for the clinician dashboard.
     */
    public function getActionItems(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'clinician'])) {
            return response()->json(['message' => 'Access denied'], 403);
        }

        $actions = [];

        // 1. Pending Donors
        $pendingDonors = DonorProfile::with('user:id,first_name,last_name')
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get();
        
        foreach ($pendingDonors as $donor) {
            $actions[] = [
                'id' => 'donor_' . $donor->id,
                'type' => 'review_donor',
                'title' => 'Review New Donor Profile',
                'description' => 'Donor ' . ($donor->user->first_name ?? '') . ' ' . ($donor->user->last_name ?? '') . ' is awaiting clinical review.',
                'target_id' => $donor->id,
                'created_at' => $donor->created_at,
                'priority' => 'high'
            ];
        }

        // 2. Requested Appointments
        $requestedAppts = Appointment::with(['donorProfile.user'])
            ->where('status', 'requested')
            ->orderBy('created_at', 'asc')
            ->get();
        
        foreach ($requestedAppts as $appt) {
            $donor = $appt->donorProfile;
            $name = $donor ? (($donor->user->first_name ?? '') . ' ' . ($donor->user->last_name ?? '')) : 'Unknown';
            $isRetrieval = $appt->appointment_type === 'egg_retrieval';
            
            $actions[] = [
                'id' => 'appt_req_' . $appt->id,
                'type' => 'confirm_appointment',
                'title' => $isRetrieval ? 'Confirm Egg Retrieval Schedule' : 'Confirm Appointment Request',
                'description' => $isRetrieval 
                    ? 'Egg Retrieval procedure requested on ' . ($appt->preferred_date ? $appt->preferred_date->format('Y-m-d') : '') . ' for Donor ' . $name . '.'
                    : 'Donor ' . $name . ' requested an appointment on ' . ($appt->preferred_date ? $appt->preferred_date->format('Y-m-d') : '') . '.',
                'target_id' => $appt->id,
                'donor_id' => $donor ? $donor->id : null,
                'created_at' => $appt->created_at,
                'priority' => $isRetrieval ? 'high' : 'medium'
            ];
        }

        // 3. Confirmed Appointments (Pending Completion/Test submission)
        $confirmedAppts = Appointment::with(['donorProfile.user'])
            ->where('status', 'confirmed')
            ->orderBy('preferred_date', 'asc')
            ->get();
        
        foreach ($confirmedAppts as $appt) {
            $donor = $appt->donorProfile;
            $name = $donor ? (($donor->user->first_name ?? '') . ' ' . ($donor->user->last_name ?? '')) : 'Unknown';
            $actions[] = [
                'id' => 'appt_conf_' . $appt->id,
                'type' => 'complete_appointment',
                'title' => 'Complete Appointment',
                'description' => 'Finalize ' . str_replace('_', ' ', $appt->appointment_type) . ' for ' . $name . ' and generate screening documentation.',
                'target_id' => $appt->id,
                'donor_id' => $donor ? $donor->id : null,
                'created_at' => $appt->updated_at,
                'priority' => 'high'
            ];
        }

        // 4. Proposed Matches
        $proposedMatches = MatchResult::with(['donorProfile.user', 'recipientProfile.user'])
            ->where('status', 'proposed')
            ->orderBy('created_at', 'desc')
            ->get();
        
        foreach ($proposedMatches as $match) {
            $actions[] = [
                'id' => 'match_' . $match->id,
                'type' => 'review_match',
                'title' => 'Review Proposed Match',
                'description' => 'A match between Donor ' . ($match->donorProfile->donor_code ?? '') . ' and Recipient ' . ($match->recipientProfile->recipient_code ?? '') . ' requires clinical approval.',
                'target_id' => $match->id,
                'created_at' => $match->created_at,
                'priority' => 'medium'
            ];
        }

        // 5. Processing Payments (Waiting Clinical Approval)
        $processingPayments = \App\Models\Payment::with(['donor.user', 'donationCycle'])
            ->where('payment_status', 'processing')
            ->orderBy('updated_at', 'asc')
            ->get();
        
        foreach ($processingPayments as $payment) {
            $cycle = $payment->donationCycle;
            $stageName = ucwords(str_replace('_', ' ', $payment->payment_stage));
            
            $actions[] = [
                'id' => 'payment_proc_' . $payment->id,
                'type' => 'review_payment',
                'title' => 'Review Processing Payment',
                'description' => 'A payment of UGX ' . number_format((float)$payment->amount) . ' for Cycle #' . ($cycle->id ?? 'Unknown') . ' (' . $stageName . ') is waiting for clinical approval.',
                'target_id' => $payment->id,
                'created_at' => $payment->updated_at,
                'priority' => 'high'
            ];
        }

        // Sort by priority (high first) then by created_at (oldest first for actionability)
        usort($actions, function ($a, $b) {
            if ($a['priority'] === $b['priority']) {
                return $a['created_at'] <=> $b['created_at'];
            }
            return $a['priority'] === 'high' ? -1 : 1;
        });

        return response()->json([
            'action_items' => $actions
        ]);
    }
}
