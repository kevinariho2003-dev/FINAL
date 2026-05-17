<?php

namespace App\Http\Controllers;

use App\Models\DonorProfile;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

// /consultation

// submitConsultationRequest

class DonorController extends Controller
{
    /**
     * GET /api/donors/me
     * Get current donor's profile - FIXED VERSION
     */
    public function getMe(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'donor') {
            return response()->json(['message' => 'Not a donor account'], 403);
        }

        $profile = DonorProfile::where('user_id', $user->id)->first();

        // If profile doesn't exist, create it with ALL required fields
        if (!$profile) {
            try {
                $profile = DonorProfile::create([
                    'user_id' => $user->id,
                    'donor_code' => DonorProfile::generateCode(),
                    'stage' => 'pre_consultation',
                    'approval_status' => 'pending',
                    'consultation_status' => 'pending',
                    'date_of_birth' => now()->subYears(25)->toDateString(), // ✅ REQUIRED - Cannot be null
                ]);

                \Log::info("Created new donor profile for user {$user->id}");

            } catch (\Exception $e) {
                \Log::error("Error creating donor profile: " . $e->getMessage());
                return response()->json([
                    'message' => 'Error creating donor profile',
                    'error' => $e->getMessage()
                ], 500);
            }
        }

        return response()->json($profile->load('user'));
    }

    /**
     * List donors — clinicians/admins see all, donors see own.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (in_array($user->role, ['admin', 'clinician'])) {
            $query = DonorProfile::with('user');

            if ($request->has('stage')) {
                $query->where('stage', $request->stage);
            }

            if ($request->has('approval_status')) {
                $query->where('approval_status', $request->approval_status);
            }

            if ($request->has('blood_type')) {
                $query->where('blood_type', $request->blood_type);
            }

            if ($request->has('availability')) {
                $query->where('availability_status', $request->availability);
            }

            if ($request->has('ethnicity')) {
                $query->where('ethnicity', 'like', '%' . $request->ethnicity . '%');
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('donor_code', 'like', "%{$search}%")
                      ->orWhereHas('user', function ($uq) use ($search) {
                          $uq->where('first_name', 'like', "%{$search}%")
                             ->orWhere('last_name', 'like', "%{$search}%");
                      });
                });
            }

            return response()->json($query->orderBy('created_at', 'desc')->paginate(15));
        }

        // Donor sees only their own profile
        $profile = DonorProfile::where('user_id', $user->id)->with('user')->first();
        return response()->json($profile);
    }

    /**
     * GET /api/donors/{id}
     * Get specific donor
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $profile = DonorProfile::with('user')->findOrFail($id);

        // Donors can only see their own profile
        if ($user->role === 'donor' && $profile->user_id !== $user->id) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        return response()->json($profile);
    }

    /**
     * POST /api/donors
     * Create donor profile
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'donor') {
            return response()->json(['message' => 'Only donors can create profiles.'], 403);
        }

        if (DonorProfile::where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Profile already exists.'], 409);
        }

        $validated = $request->validate([
            'date_of_birth' => 'required|date|before:-18 years',
            'blood_type' => 'nullable|string|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'genotype' => 'nullable|string|in:AA,AS,AC,SS,SC,CC',
            'height_cm' => 'nullable|numeric|min:100|max:250',
            'weight_kg' => 'nullable|numeric|min:30|max:200',
            'ethnicity' => 'nullable|string|max:100',
        ]);

        try {
            $profile = DonorProfile::create([
                ...$validated,
                'user_id' => $user->id,
                'donor_code' => DonorProfile::generateCode(),
                'stage' => 'pre_consultation',
                'approval_status' => 'pending',
                'consultation_status' => 'pending',
            ]);

            return response()->json(['message' => 'Profile created', 'profile' => $profile], 201);

        } catch (\Exception $e) {
            \Log::error("Error creating profile: " . $e->getMessage());
            return response()->json([
                'message' => 'Error creating profile',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * PUT/PATCH /api/donors/{id}
     * Update donor profile
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $profile = DonorProfile::findOrFail($id);

        // Security check
        if ($user->role === 'donor') {
            if ($profile->user_id !== $user->id) {
                return response()->json(['message' => 'Access denied.'], 403);
            }

            // Donors can only update if consultation is complete
            if ($profile->stage === 'pre_consultation' && $profile->consultation_status !== 'completed') {
                return response()->json(['message' => 'Complete consultation before updating profile.'], 403);
            }
        }

        $validated = $request->validate([
            'date_of_birth' => 'sometimes|date|before:-18 years',
            'blood_type' => 'nullable|string|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'genotype' => 'nullable|string|in:AA,AS,AC,SS,SC,CC',
            'height_cm' => 'nullable|numeric|min:100|max:250',
            'weight_kg' => 'nullable|numeric|min:30|max:200',
            'ethnicity' => 'nullable|string|max:100',
            'skin_tone' => 'nullable|string|max:50',
            'hair_color' => 'nullable|string|max:50',
            'hair_texture' => 'nullable|string|max:50',
            'eye_color' => 'nullable|string|max:50',
            'education_level' => 'nullable|string|max:100',
            'occupation' => 'nullable|string|max:100',
            'medical_history' => 'nullable|array',
            'family_medical_history' => 'nullable|array',
            'availability_status' => 'sometimes|in:available,unavailable,on_cycle',
        ]);

        // Calculate BMI if height and weight provided
        $heightCm = $validated['height_cm'] ?? $profile->height_cm;
        $weightKg = $validated['weight_kg'] ?? $profile->weight_kg;
        if ($heightCm && $weightKg) {
            $heightM = $heightCm / 100;
            $validated['bmi'] = round($weightKg / ($heightM * $heightM), 1);
        }

        $oldValues = $profile->toArray();
        $profile->update($validated);

        // Log audit
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'donor.profile.updated',
            'resource_type' => 'DonorProfile',
            'resource_id' => $profile->id,
            'old_values' => $oldValues,
            'new_values' => $profile->fresh()->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Profile updated successfully',
            'profile' => $profile->fresh()->load('user'),
        ]);
    }

    /**
     * POST /api/donors/consultation/request
     * Submit consultation request
     */
    public function submitConsultationRequest(Request $request)
    {
        try {
            $user = Auth::user();
            $profile = DonorProfile::where('user_id', $user->id)->first();

            if (!$profile) {
                return response()->json(['message' => 'Donor profile not found'], 404);
            }

            $validated = $request->validate([
                'type' => 'required|in:call,virtual,clinic',
                'preferred_date' => 'required|date|after_or_equal:today',
                'preferred_time' => 'required|string',
                'contact_info' => 'required|string|max:255',
            ]);

            $updateData = [
                'consultation_type' => $validated['type'],
                'consultation_date' => $validated['preferred_date'],
                'consultation_time' => $validated['preferred_time'],
                'consultation_status' => 'pending',
            ];

            // Store contact info based on type
            if ($validated['type'] === 'call') {
                $updateData['phone_number'] = $validated['contact_info'];
            } elseif ($validated['type'] === 'virtual') {
                $updateData['consultation_email'] = $validated['contact_info'];
            }

            $profile->update($updateData);

            // Log action
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'consultation.requested',
                'resource_type' => 'DonorProfile',
                'resource_id' => $profile->id,
                'new_values' => ['consultation_type' => $validated['type']],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'message' => 'Consultation requested successfully',
                'profile' => $profile->fresh()
            ]);

        } catch (\Exception $e) {
            \Log::error('Consultation request error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to request consultation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * PUT /api/donors/update-profile
     * Submit questionnaire
     */
    public function submitQuestionnaire(Request $request)
    {
        $user = $request->user();
        $profile = DonorProfile::where('user_id', $user->id)->first();

        if (!$profile) {
            return response()->json(['message' => 'Donor profile not found'], 404);
        }

        // Check consultation is complete
        if ($profile->stage === 'pre_consultation' || $profile->consultation_status !== 'completed') {
            return response()->json(['message' => 'Consultation required before questionnaire submission.'], 403);
        }

        $validated = $request->validate([
            'medical_history' => 'nullable|array',
            'family_medical_history' => 'nullable|array',
            'blood_type' => 'nullable|string|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'genotype' => 'nullable|string|in:AA,AS,AC,SS,SC,CC',
        ]);

        $profile->update([
            ...$validated,
            'stage' => 'profile_completion',
            'approval_status' => 'pending',
            'stage_updated_at' => now(),
        ]);

        return response()->json(['message' => 'Profile submitted for review', 'profile' => $profile->fresh()]);
    }

    /**
     * PATCH /api/donors/{id}/status
     * Update donor status (clinician/admin only)
     */
    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'clinician'])) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $validated = $request->validate([
            'approval_status' => 'required|in:pending,approved,denied,suspended',
            'genetic_screening_status' => 'sometimes|in:pending,clear,flagged',
        ]);

        $profile = DonorProfile::findOrFail($id);
        $oldStatus = $profile->approval_status;

        $profile->update($validated);

        // Log audit
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'donor.status.updated',
            'resource_type' => 'DonorProfile',
            'resource_id' => $profile->id,
            'old_values' => ['approval_status' => $oldStatus],
            'new_values' => ['approval_status' => $validated['approval_status']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Status updated', 'profile' => $profile->fresh()]);
    }

    /**
     * POST /api/donors/{id}/photo
     * Upload photo
     */
    public function uploadPhoto(Request $request, $id)
    {
        $user = $request->user();
        $profile = DonorProfile::findOrFail($id);

        if ($user->role === 'donor' && $profile->user_id !== $user->id) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $request->validate(['photo' => 'required|image|mimes:jpeg,png,jpg|max:5120']);

        try {
            // Delete old photo if exists
            if ($profile->photo_path && Storage::disk('public')->exists($profile->photo_path)) {
                Storage::disk('public')->delete($profile->photo_path);
            }

            // Store new photo
            $path = $request->file('photo')->store('donor_photos', 'public');
            $profile->update(['photo_path' => $path]);

            return response()->json([
                'message' => 'Photo uploaded successfully',
                'photo_url' => asset('storage/' . $path)
            ]);

        } catch (\Exception $e) {
            \Log::error("Photo upload error: " . $e->getMessage());
            return response()->json([
                'message' => 'Error uploading photo',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}