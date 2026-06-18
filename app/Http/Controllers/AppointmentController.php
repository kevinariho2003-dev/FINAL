<?php

namespace App\Http\Controllers;

use App\Models\DonorProfile;
use App\Models\Appointment;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    /**
     * List appointments for a donor.
     */
    public function index(Request $request, $donorId)
    {
        $user = $request->user();
        $profile = DonorProfile::findOrFail($donorId);

        $authorized = false;
        if ($user->role === 'donor' && $profile->user_id === $user->id) {
            $authorized = true;
        } elseif ($user->role === 'recipient') {
            $recipientProfile = \App\Models\RecipientProfile::where('user_id', $user->id)->first();
            if ($recipientProfile) {
                $hasActiveCycle = \App\Models\DonationCycle::where('donor_id', $donorId)
                    ->where('recipient_id', $recipientProfile->id)
                    ->where('outcome', 'pending')
                    ->exists();
                if ($hasActiveCycle) {
                    $authorized = true;
                }
            }
        } elseif (in_array($user->role, ['admin', 'clinician'])) {
            $authorized = true;
        }

        if (!$authorized) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $appointments = $profile->appointments()
            ->with('confirmer:id,first_name,last_name')
            ->orderBy('preferred_date', 'desc')
            ->get();

        return response()->json($appointments);
    }

    /**
     * Donor books an appointment.
     */
    public function store(Request $request, $donorId)
    {
        $user = $request->user();
        $profile = DonorProfile::findOrFail($donorId);

        $authorized = false;
        if ($user->role === 'donor' && $profile->user_id === $user->id) {
            if ($profile->status !== 'approved') {
                return response()->json(['message' => 'You cannot book appointments until your profile is approved by a clinician.'], 403);
            }
            $authorized = true;
        } elseif ($user->role === 'recipient') {
            $recipientProfile = \App\Models\RecipientProfile::where('user_id', $user->id)->first();
            if ($recipientProfile) {
                $hasActiveCycle = \App\Models\DonationCycle::where('donor_id', $donorId)
                    ->where('recipient_id', $recipientProfile->id)
                    ->where('outcome', 'pending')
                    ->exists();
                if ($hasActiveCycle) {
                    $authorized = true;
                }
            }
        } elseif (in_array($user->role, ['admin', 'clinician'])) {
            $authorized = true;
        }

        if (!$authorized) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $validated = $request->validate([
            'appointment_type' => 'required|in:initial_screening,follow_up,genetic_test,egg_retrieval',
            'preferred_date' => 'required|date|after:today',
            'preferred_time_slot' => 'required|in:morning,afternoon,evening',
            'donor_notes' => 'nullable|string|max:500',
        ]);

        $appointment = Appointment::create([
            'donor_profile_id' => $profile->id,
            'appointment_type' => $validated['appointment_type'],
            'preferred_date' => $validated['preferred_date'],
            'preferred_time_slot' => $validated['preferred_time_slot'],
            'donor_notes' => $validated['donor_notes'] ?? null,
            'status' => 'requested',
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'appointment.booked',
            'resource_type' => 'Appointment',
            'resource_id' => $appointment->id,
            'new_values' => $appointment->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Appointment requested successfully',
            'appointment' => $appointment,
        ], 201);
    }

    /**
     * Clinician updates appointment status (confirm/complete/cancel).
     */
    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();

        if ($user->role !== 'clinician') {
            return response()->json(['message' => 'Access denied. Only clinicians can manage appointment status.'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:confirmed,completed,cancelled',
            'clinic_notes' => 'nullable|string|max:500',
        ]);

        $appointment = Appointment::findOrFail($id);
        $old = $appointment->status;

        $updateData = [
            'status' => $validated['status'],
            'clinic_notes' => $validated['clinic_notes'] ?? $appointment->clinic_notes,
        ];

        if ($validated['status'] === 'confirmed' && !$appointment->confirmed_at) {
            $updateData['confirmed_by'] = $user->id;
            $updateData['confirmed_at'] = now();
        }

        $appointment->update($updateData);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'appointment.status.updated',
            'resource_type' => 'Appointment',
            'resource_id' => $appointment->id,
            'old_values' => ['status' => $old],
            'new_values' => ['status' => $validated['status']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Appointment ' . $validated['status'] . ' successfully',
            'appointment' => $appointment->fresh()->load('confirmer:id,first_name,last_name'),
        ]);
    }

    /**
     * Donor cancels own requested appointment.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $appointment = Appointment::findOrFail($id);
        $profile = DonorProfile::findOrFail($appointment->donor_profile_id);

        if ($user->role === 'donor' && $profile->user_id !== $user->id) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        if ($appointment->status !== 'requested' && $user->role === 'donor') {
            return response()->json(['message' => 'Cannot cancel a confirmed or completed appointment.'], 422);
        }

        $appointment->delete();

        return response()->json(['message' => 'Appointment cancelled successfully']);
    }
}
