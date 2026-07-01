<?php

namespace App\Http\Controllers;

use App\Models\DonationCycle;
use App\Models\Medication;
use App\Models\DonorProfile;
use App\Models\RecipientProfile;
use App\Models\MatchResult;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class DonationCycleController extends Controller
{
    /**
     * List donation cycles — filtered by role.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = DonationCycle::with(['donor.user', 'recipient.user', 'medications', 'payments']);

        if ($user->role === 'donor') {
            $donorProfile = DonorProfile::where('user_id', $user->id)->first();
            if (!$donorProfile) return response()->json([]);
            $query->where('donor_id', $donorProfile->id);
        } elseif ($user->role === 'recipient') {
            $recipientProfile = RecipientProfile::where('user_id', $user->id)->first();
            if (!$recipientProfile) return response()->json([]);
            $query->where('recipient_id', $recipientProfile->id);
        } else {
            // Admin/clinician can filter
            if ($request->has('outcome')) {
                $query->where('outcome', $request->outcome);
            }
            if ($request->has('donor_id')) {
                $query->where('donor_id', $request->donor_id);
            }
            if ($request->has('recipient_id')) {
                $query->where('recipient_id', $request->recipient_id);
            }
        }

        $cycles = $query->orderBy('created_at', 'desc')->paginate(15);
        $cycles->getCollection()->transform(function ($c) use ($user) {
            return $this->maskCycle($c, $user);
        });
        return response()->json($cycles);
    }

    /**
     * Create a donation cycle from an approved match.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'clinician') {
            return response()->json(['message' => 'Only clinicians can create donation cycles.'], 403);
        }

        $validated = $request->validate([
            'match_id' => 'required|exists:matches,id',
            'start_date' => 'required|date|after_or_equal:today',
        ]);

        // Verify the match is approved by clinician and accepted by recipient
        $match = MatchResult::findOrFail($validated['match_id']);
        if ($match->status !== 'approved') {
            return response()->json(['message' => 'Only approved matches can start a donation cycle.'], 422);
        }
        if ($match->recipient_status !== 'accepted') {
            return response()->json(['message' => 'The recipient has not accepted this match yet.'], 422);
        }

        // Check no active cycle exists for this donor-recipient pair
        $existingCycle = DonationCycle::where('donor_id', $match->donor_id)
            ->where('recipient_id', $match->recipient_id)
            ->where('outcome', 'pending')
            ->first();

        if ($existingCycle) {
            return response()->json(['message' => 'An active donation cycle already exists for this pair.'], 409);
        }

        $cycle = DonationCycle::create([
            'donor_id' => $match->donor_id,
            'recipient_id' => $match->recipient_id,
            'start_date' => $validated['start_date'],
            'outcome' => 'pending',
        ]);

        // Update match status to completed
        $match->update(['status' => 'completed']);

        // Update donor availability
        DonorProfile::where('id', $match->donor_id)
            ->update(['availability_status' => 'on_cycle']);

        // Audit
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'donation_cycle.created',
            'resource_type' => 'DonationCycle',
            'resource_id' => $cycle->id,
            'new_values' => $cycle->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $loadedCycle = $cycle->load(['donor.user', 'recipient.user']);
        $this->maskCycle($loadedCycle, $user);

        return response()->json([
            'message' => 'Donation cycle created successfully',
            'cycle' => $loadedCycle,
        ], 201);
    }

    /**
     * Show a single donation cycle with medications and payment.
     */
    public function show(Request $request, $id)
    {
        $cycle = DonationCycle::with(['donor.user', 'recipient.user', 'medications', 'payments'])
            ->findOrFail($id);
        $this->maskCycle($cycle, $request->user());

        return response()->json($cycle);
    }

    /**
     * Update cycle outcome and eggs retrieved (clinician/admin only).
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        if ($user->role !== 'clinician') {
            return response()->json(['message' => 'Access denied. Only clinicians can update donation cycles.'], 403);
        }

        $validated = $request->validate([
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'eggs_retrieved' => 'nullable|integer|min:0',
            'outcome' => 'sometimes|in:pending,successful,unsuccessful,cancelled',
        ]);

        $cycle = DonationCycle::findOrFail($id);
        $old = $cycle->toArray();

        $cycle->update($validated);

        // If cycle is completed or cancelled, free up the donor
        if (in_array($cycle->outcome, ['successful', 'unsuccessful', 'cancelled'])) {
            DonorProfile::where('id', $cycle->donor_id)
                ->update(['availability_status' => 'available']);
        }

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'donation_cycle.updated',
            'resource_type' => 'DonationCycle',
            'resource_id' => $cycle->id,
            'old_values' => $old,
            'new_values' => $cycle->fresh()->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $loadedCycle = $cycle->fresh()->load(['donor.user', 'recipient.user', 'medications', 'payments']);
        $this->maskCycle($loadedCycle, $user);

        return response()->json([
            'message' => 'Donation cycle updated',
            'cycle' => $loadedCycle,
        ]);
    }

    /**
     * Add a medication to a donation cycle.
     */
    public function addMedication(Request $request, $cycleId)
    {
        $user = $request->user();

        if ($user->role !== 'clinician') {
            return response()->json(['message' => 'Access denied. Only clinicians can prescribe medications.'], 403);
        }

        $validated = $request->validate([
            'target_patient' => 'required|in:donor,recipient',
            'drug_name' => 'required|string|max:255',
            'dosage' => 'required|string|max:255',
            'frequency' => 'required|string|max:255',
            'duration' => 'required|string|max:255',
        ]);

        $cycle = DonationCycle::findOrFail($cycleId);

        $medication = Medication::create([
            'cycle_id' => $cycle->id,
            ...$validated,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'medication.prescribed',
            'resource_type' => 'Medication',
            'resource_id' => $medication->id,
            'new_values' => $medication->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Medication added',
            'medication' => $medication,
        ], 201);
    }

    /**
     * Remove a medication from a donation cycle.
     */
    public function removeMedication(Request $request, $medicationId)
    {
        $user = $request->user();

        if ($user->role !== 'clinician') {
            return response()->json(['message' => 'Access denied. Only clinicians can remove medications.'], 403);
        }

        $medication = Medication::findOrFail($medicationId);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'medication.removed',
            'resource_type' => 'Medication',
            'resource_id' => $medication->id,
            'old_values' => $medication->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $medication->delete();

        return response()->json(['message' => 'Medication removed']);
    }

    /**
     * Helper to mask PII according to user role.
     */
    private function maskCycle(DonationCycle $cycle, $user)
    {
        if (in_array($user->role, ['donor', 'recipient'])) {
            if ($cycle->donor) {
                if ($cycle->donor->user) {
                    $cycle->donor->user->first_name = 'Donor';
                    $cycle->donor->user->last_name = $cycle->donor->donor_code;
                    $cycle->donor->user->makeHidden(['email', 'phone', 'date_of_birth', 'avatar']);
                }
                $cycle->donor->makeHidden(['photo_path', 'date_of_birth', 'medical_history', 'family_medical_history']);
            }
            if ($cycle->recipient) {
                if ($cycle->recipient->user) {
                    $cycle->recipient->user->first_name = 'Recipient';
                    $cycle->recipient->user->last_name = $cycle->recipient->recipient_code;
                    $cycle->recipient->user->makeHidden(['email', 'phone', 'date_of_birth', 'avatar']);
                }
                $cycle->recipient->makeHidden(['diagnosis', 'treatment_history']);
            }
        } elseif ($user->role === 'admin') {
            // Admins see names and codes but not photo (avatar/photo_path), phone, date_of_birth
            if ($cycle->donor) {
                if ($cycle->donor->user) {
                    $cycle->donor->user->makeHidden(['phone', 'date_of_birth', 'avatar']);
                }
                $cycle->donor->makeHidden(['photo_path', 'date_of_birth']);
            }
            if ($cycle->recipient) {
                if ($cycle->recipient->user) {
                    $cycle->recipient->user->makeHidden(['phone', 'date_of_birth', 'avatar']);
                }
            }
        }
        return $cycle;
    }
}
