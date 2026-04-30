<?php

namespace App\Http\Controllers;

use App\Models\RecipientProfile;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RecipientController extends Controller
{
    /**
     * List recipients — clinicians/admins see all, recipients see own.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (in_array($user->role, ['admin', 'clinician'])) {
            $query = RecipientProfile::with(['user', 'clinician']);

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
            if ($request->has('priority')) {
                $query->where('priority_level', $request->priority);
            }
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('recipient_code', 'like', "%{$search}%")
                      ->orWhereHas('user', function ($uq) use ($search) {
                          $uq->where('first_name', 'like', "%{$search}%")
                             ->orWhere('last_name', 'like', "%{$search}%");
                      });
                });
            }

            $recipients = $query->orderBy('created_at', 'desc')->paginate(15);
            return response()->json($recipients);
        }

        $profile = RecipientProfile::where('user_id', $user->id)->with(['user', 'clinician'])->first();
        return response()->json($profile);
    }

    /**
     * Create a recipient profile.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'recipient') {
            return response()->json(['message' => 'Only recipients can create recipient profiles.'], 403);
        }

        if (RecipientProfile::where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Recipient profile already exists.'], 409);
        }

        $validated = $request->validate([
            'diagnosis' => 'nullable|string|max:2000',
            'treatment_history' => 'nullable|string|max:2000',
            'preferred_blood_type' => 'nullable|string|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'preferred_genotype' => 'nullable|string|in:AA,AS,AC,SS,SC,CC',
            'preferred_ethnicity' => 'nullable|string|max:100',
            'preferred_skin_tone' => 'nullable|string|max:50',
            'preferred_hair_color' => 'nullable|string|max:50',
            'preferred_eye_color' => 'nullable|string|max:50',
            'preferred_age_min' => 'nullable|integer|min:18|max:45',
            'preferred_age_max' => 'nullable|integer|min:18|max:45',
            'preferred_education_level' => 'nullable|string|max:100',
            'max_previous_donations' => 'nullable|integer|min:0|max:20',
            'priority_level' => 'sometimes|in:normal,urgent',
            'is_international' => 'sometimes|boolean',
        ]);

        $profile = RecipientProfile::create([
            ...$validated,
            'user_id' => $user->id,
            'recipient_code' => RecipientProfile::generateCode(),
            'status' => 'active',
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'recipient.profile.created',
            'resource_type' => 'RecipientProfile',
            'resource_id' => $profile->id,
            'new_values' => $profile->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Recipient profile created successfully',
            'profile' => $profile->load(['user', 'clinician']),
        ], 201);
    }

    /**
     * Show a single recipient profile.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $profile = RecipientProfile::with(['user', 'clinician'])->findOrFail($id);

        if ($user->role === 'recipient' && $profile->user_id !== $user->id) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        return response()->json($profile);
    }

    /**
     * Update a recipient profile.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $profile = RecipientProfile::findOrFail($id);

        if ($user->role === 'recipient' && $profile->user_id !== $user->id) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $validated = $request->validate([
            'diagnosis' => 'nullable|string|max:2000',
            'treatment_history' => 'nullable|string|max:2000',
            'preferred_blood_type' => 'nullable|string|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'preferred_genotype' => 'nullable|string|in:AA,AS,AC,SS,SC,CC',
            'preferred_ethnicity' => 'nullable|string|max:100',
            'preferred_skin_tone' => 'nullable|string|max:50',
            'preferred_hair_color' => 'nullable|string|max:50',
            'preferred_eye_color' => 'nullable|string|max:50',
            'preferred_age_min' => 'nullable|integer|min:18|max:45',
            'preferred_age_max' => 'nullable|integer|min:18|max:45',
            'preferred_education_level' => 'nullable|string|max:100',
            'max_previous_donations' => 'nullable|integer|min:0|max:20',
            'priority_level' => 'sometimes|in:normal,urgent',
            'is_international' => 'sometimes|boolean',
            'clinician_id' => 'sometimes|nullable|exists:users,id',
        ]);

        $old = $profile->toArray();
        $profile->update($validated);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'recipient.profile.updated',
            'resource_type' => 'RecipientProfile',
            'resource_id' => $profile->id,
            'old_values' => $old,
            'new_values' => $profile->fresh()->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Profile updated successfully',
            'profile' => $profile->fresh()->load(['user', 'clinician']),
        ]);
    }

    /**
     * Update recipient status (Approve/Suspend) - Clinician/Admin only.
     */
    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'clinician'])) {
            return response()->json(['message' => 'Permission denied.'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,approved,suspended',
        ]);

        $profile = RecipientProfile::findOrFail($id);
        $oldStatus = $profile->status;
        
        $profile->update(['status' => $validated['status']]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'recipient.status.updated',
            'resource_type' => 'RecipientProfile',
            'resource_id' => $profile->id,
            'old_values' => ['status' => $oldStatus],
            'new_values' => ['status' => $profile->status],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => "Recipient status updated to {$profile->status}",
            'profile' => $profile->fresh(),
        ]);
    }
}
