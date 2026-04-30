<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\DonorProfile;
use App\Models\RecipientProfile;
use App\Models\MatchResult;
use App\Models\AuditLog;
use App\Models\MatchingCriteriaWeight;
use App\Models\ClinicianProfile;
use App\Models\DonationCycle;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    /**
     * Create a new clinician account (admin only).
     */
    public function createClinician(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'nullable|string|max:20',
            'password' => ['required', 'confirmed', Password::min(8)],
            'specialization' => 'nullable|string|max:255',
            'license_number' => 'required|string|max:255|unique:clinician_profiles',
            'years_of_experience' => 'nullable|integer|min:0',
            'bio' => 'nullable|string|max:2000',
        ]);

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role' => 'clinician',
            'password' => Hash::make($validated['password']),
            'is_active' => true,
        ]);

        // Create clinician profile (ER diagram: Users 1:1 Clinicians)
        $profile = ClinicianProfile::create([
            'user_id' => $user->id,
            'specialization' => $validated['specialization'] ?? null,
            'license_number' => $validated['license_number'],
            'years_of_experience' => $validated['years_of_experience'] ?? 0,
            'bio' => $validated['bio'] ?? null,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'clinician.created',
            'resource_type' => 'User',
            'resource_id' => $user->id,
            'new_values' => ['email' => $user->email, 'name' => $user->full_name, 'license_number' => $profile->license_number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Clinician account created successfully',
            'user' => $user->load('clinicianProfile'),
        ], 201);
    }

    /**
     * Get pending donor profiles for admin review.
     */
    public function pendingDonors()
    {
        $donors = DonorProfile::with('user')
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($donors);
    }

    /**
     * System statistics dashboard.
     */
    public function statistics()
    {
        return response()->json([
            'total_users' => User::count(),
            'total_donors' => DonorProfile::count(),
            'approved_donors' => DonorProfile::where('status', 'approved')->count(),
            'pending_donors' => DonorProfile::where('status', 'pending')->count(),
            'total_recipients' => RecipientProfile::count(),
            'total_matches' => MatchResult::count(),
            'approved_matches' => MatchResult::where('status', 'approved')->count(),
            'proposed_matches' => MatchResult::where('status', 'proposed')->count(),
            'total_donation_cycles' => DonationCycle::count(),
            'active_cycles' => DonationCycle::where('outcome', 'pending')->count(),
            'successful_cycles' => DonationCycle::where('outcome', 'successful')->count(),
            'total_payments' => Payment::count(),
            'pending_payments' => Payment::where('payment_status', 'pending')->count(),
            'completed_payments' => Payment::where('payment_status', 'completed')->count(),
            'users_by_role' => [
                'admin' => User::where('role', 'admin')->count(),
                'clinician' => User::where('role', 'clinician')->count(),
                'donor' => User::where('role', 'donor')->count(),
                'recipient' => User::where('role', 'recipient')->count(),
            ],
        ]);
    }

    /**
     * Audit logs list.
     */
    public function auditLogs(Request $request)
    {
        $query = AuditLog::with('user')->orderBy('created_at', 'desc');

        if ($request->has('action')) {
            $query->where('action', 'like', '%' . $request->action . '%');
        }
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        return response()->json($query->paginate(25));
    }

    /**
     * User management list.
     */
    public function users(Request $request)
    {
        $query = User::orderBy('created_at', 'desc');

        if ($request->has('role')) $query->where('role', $request->role);
        if ($request->has('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('first_name', 'like', "%{$s}%")
                  ->orWhere('last_name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%");
            });
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Toggle user active/inactive.
     */
    public function toggleUserStatus(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => !$user->is_active]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $user->is_active ? 'user.activated' : 'user.deactivated',
            'resource_type' => 'User',
            'resource_id' => $user->id,
            'new_values' => ['is_active' => $user->is_active],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'User status updated', 'user' => $user]);
    }

    /**
     * Get matching criteria weights.
     */
    public function getWeights()
    {
        return response()->json(MatchingCriteriaWeight::orderBy('criterion_name')->get());
    }

    /**
     * Update matching criteria weights.
     */
    public function updateWeights(Request $request)
    {
        $validated = $request->validate([
            'weights' => 'required|array',
            'weights.*.id' => 'required|exists:matching_criteria_weights,id',
            'weights.*.weight' => 'required|numeric|min:0|max:1',
        ]);

        foreach ($validated['weights'] as $w) {
            MatchingCriteriaWeight::where('id', $w['id'])->update([
                'weight' => $w['weight'],
                'updated_by' => $request->user()->id,
            ]);
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'matching.weights.updated',
            'resource_type' => 'MatchingCriteriaWeight',
            'resource_id' => 0,
            'new_values' => $validated['weights'],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Weights updated', 'weights' => MatchingCriteriaWeight::all()]);
    }
}
