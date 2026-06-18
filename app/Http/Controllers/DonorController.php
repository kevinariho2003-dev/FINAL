<?php

namespace App\Http\Controllers;

use App\Models\DonorProfile;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class DonorController extends Controller
{
    /**
     * List donors — clinicians/admins see all, donors see own.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (in_array($user->role, ['admin', 'clinician'])) {
            $query = DonorProfile::with('user');

            // Filters
            if ($request->has('status')) {
                $query->where('status', $request->status);
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

            $donors = $query->orderBy('created_at', 'desc')->paginate(15);
            return response()->json($donors);
        }

        // Donors see only their own profile
        $profile = DonorProfile::where('user_id', $user->id)->with('user')->first();
        return response()->json($profile);
    }

    /**
     * Create a donor profile.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'donor') {
            return response()->json(['message' => 'Only donors can create donor profiles.'], 403);
        }

        if (DonorProfile::where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Donor profile already exists.'], 409);
        }

        $validated = $request->validate([
            'date_of_birth' => 'required|date|before:-18 years',
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
        ]);

        // Calculate BMI if height and weight provided
        $bmi = null;
        if (!empty($validated['height_cm']) && !empty($validated['weight_kg'])) {
            $heightM = $validated['height_cm'] / 100;
            $bmi = round($validated['weight_kg'] / ($heightM * $heightM), 1);
        }

        $profile = DonorProfile::create([
            ...$validated,
            'user_id' => $user->id,
            'donor_code' => DonorProfile::generateCode(),
            'bmi' => $bmi,
            'status' => 'pending',
        ]);

        // Audit log
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'donor.profile.created',
            'resource_type' => 'DonorProfile',
            'resource_id' => $profile->id,
            'new_values' => $profile->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Donor profile created successfully',
            'profile' => $profile->load('user'),
        ], 201);
    }

    /**
     * Show a single donor profile.
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
     * Update a donor profile.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $profile = DonorProfile::findOrFail($id);

        // Only the owning donor or clinician/admin can update
        if ($user->role === 'donor') {
            if ($profile->user_id !== $user->id) {
                return response()->json(['message' => 'Access denied.'], 403);
            }
            // Donors can ONLY update dynamic attributes after initial creation
            $request->replace($request->only([
                'weight_kg', 
                'education_level', 
                'occupation', 
                'availability_status'
            ]));
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

        $old = $profile->toArray();

        // Recalculate BMI if height or weight changed
        $heightCm = $validated['height_cm'] ?? $profile->height_cm;
        $weightKg = $validated['weight_kg'] ?? $profile->weight_kg;
        if ($heightCm && $weightKg) {
            $heightM = $heightCm / 100;
            $validated['bmi'] = round($weightKg / ($heightM * $heightM), 1);
        }

        $profile->update($validated);

        // Audit log
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'donor.profile.updated',
            'resource_type' => 'DonorProfile',
            'resource_id' => $profile->id,
            'old_values' => $old,
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
     * Update donor status (clinician/admin only).
     */
    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'clinician'])) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,approved,suspended,inactive',
            'genetic_screening_status' => 'sometimes|in:pending,clear,flagged',
        ]);

        $profile = DonorProfile::findOrFail($id);
        $old = $profile->toArray();

        // ── Mandatory photo check before approval ──
        if ($validated['status'] === 'approved' && empty($profile->photo_path)) {
            return response()->json([
                'message' => 'Cannot approve donor: a profile photo must be uploaded first. The recipient needs to verify the donor\'s physicality.',
            ], 422);
        }

        $profile->update($validated);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'donor.status.updated',
            'resource_type' => 'DonorProfile',
            'resource_id' => $profile->id,
            'old_values' => ['status' => $old['status']],
            'new_values' => ['status' => $profile->status],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Donor status updated',
            'profile' => $profile->fresh()->load('user'),
        ]);
    }

    /**
     * Upload a profile photo for the donor.
     */
    public function uploadPhoto(Request $request, $id)
    {
        $user = $request->user();
        $profile = DonorProfile::findOrFail($id);

        // Only the owning donor or clinician/admin can upload
        if ($user->role === 'donor' && $profile->user_id !== $user->id) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        // Delete old photo if exists
        if ($profile->photo_path && Storage::disk('public')->exists($profile->photo_path)) {
            Storage::disk('public')->delete($profile->photo_path);
        }

        $path = $request->file('photo')->store('donor_photos', 'public');
        $profile->update(['photo_path' => $path]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'donor.photo.uploaded',
            'resource_type' => 'DonorProfile',
            'resource_id' => $profile->id,
            'new_values' => ['photo_path' => $path],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Photo uploaded successfully',
            'photo_url' => asset('storage/' . $path),
            'profile' => $profile->fresh()->load('user'),
        ]);
    }
}
