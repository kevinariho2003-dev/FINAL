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
            'action' => 'appointment.requested',
            'resource_type' => 'Appointment',
            'resource_id' => $appointment->id,
            'new_values' => $appointment->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Appointment requested successfully.',
            'appointment' => $appointment
        ], 201);
    }

    /**
     * Clinician schedules an appointment directly.
     */
    public function clinicianStore(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'donor_profile_id' => 'nullable|exists:donor_profiles,id',
            'recipient_profile_id' => 'nullable|exists:recipient_profiles,id',
            'appointment_type' => 'required|in:initial_screening,follow_up,genetic_test,egg_retrieval,embryo_transfer',
            'preferred_date' => 'required|date',
            'preferred_time_slot' => 'required|in:morning,afternoon,evening',
            'clinic_notes' => 'nullable|string|max:500',
        ]);

        $appointment = Appointment::create([
            'donor_profile_id' => $validated['donor_profile_id'] ?: null,
            'recipient_profile_id' => $validated['recipient_profile_id'] ?: null,
            'appointment_type' => $validated['appointment_type'],
            'preferred_date' => $validated['preferred_date'],
            'preferred_time_slot' => $validated['preferred_time_slot'],
            'clinic_notes' => $validated['clinic_notes'] ?? null,
            'status' => 'confirmed', // clinician-initiated is auto-confirmed
            'confirmed_by' => $user->id,
            'confirmed_at' => now(),
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'appointment.scheduled',
            'resource_type' => 'Appointment',
            'resource_id' => $appointment->id,
            'new_values' => $appointment->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Appointment scheduled successfully.',
            'appointment' => $appointment
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

        $appointment = Appointment::with('donorProfile')->findOrFail($id);
        $old = $appointment->status;

        if ($validated['status'] === 'confirmed' && $appointment->donorProfile->status !== 'approved') {
            return response()->json(['message' => 'Cannot confirm appointment. The donor profile has not been approved.'], 422);
        }

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

    /**
     * Clinician marks an appointment as completed and auto-generates documents if needed.
     */
    public function completeAppointment(Request $request, $id)
    {
        $user = $request->user();

        if ($user->role !== 'clinician') {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $appointment = Appointment::with('donorProfile')->findOrFail($id);

        if ($appointment->status !== 'confirmed') {
            return response()->json(['message' => 'Only confirmed appointments can be completed.'], 422);
        }

        $appointment->update(['status' => 'completed']);

        // Auto-generate document if it's initial screening
        if ($appointment->appointment_type === 'initial_screening') {
            $donor = $appointment->donorProfile;

            \App\Models\ScreeningDocument::create([
                'donor_profile_id' => $donor->id,
                'document_type' => 'medical_report',
                'original_filename' => 'System_Generated_Initial_Screening.json',
                'file_path' => 'system_generated',
                'status' => 'verified',
                'notes' => 'Auto-generated system document containing phenotypic data',
                'test_results' => [
                    'phenotype' => [
                        'blood_type' => $donor->blood_type,
                        'genotype' => $donor->genotype,
                        'eye_color' => $donor->eye_color,
                        'hair_color' => $donor->hair_color,
                        'skin_tone' => $donor->skin_tone,
                    ],
                    'background' => [
                        'education_level' => $donor->education_level,
                        'ethnicity' => $donor->ethnicity,
                        'height' => $donor->height_cm,
                        'weight' => $donor->weight_kg,
                    ]
                ],
                'review_notes' => 'Auto-generated upon initial screening completion',
                'reviewed_by' => $user->id,
                'reviewed_at' => now(),
            ]);

            // Update donor screening status
            $donor->update(['genetic_screening_status' => 'clear']);
        }

        return response()->json(['message' => 'Appointment completed successfully', 'appointment' => $appointment]);
    }
}
