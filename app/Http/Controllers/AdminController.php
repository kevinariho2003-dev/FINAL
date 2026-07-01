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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;

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
            'first_name'        => $validated['first_name'],
            'last_name'         => $validated['last_name'],
            'email'             => $validated['email'],
            'phone'             => $validated['phone'] ?? null,
            'role'              => 'clinician',
            'password'          => $validated['password'],   // model cast auto-hashes
            'is_active'         => true,
            'email_verified_at' => now(),                    // admin-created = pre-verified
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

    // pendingDonors() removed — donor review is now clinician-only (via DonorController)

    /**
     * System statistics dashboard.
     */
    public function statistics()
    {
        $data = Cache::remember('admin_statistics', 30, function () {
            $roleCounts = User::select('role', DB::raw('count(*) as total'))
                ->groupBy('role')->pluck('total', 'role');
            $donorCounts = DonorProfile::select('status', DB::raw('count(*) as total'))
                ->groupBy('status')->pluck('total', 'status');
            $matchCounts = MatchResult::select('status', DB::raw('count(*) as total'))
                ->groupBy('status')->pluck('total', 'status');
            $cycleCounts = DonationCycle::select('outcome', DB::raw('count(*) as total'))
                ->groupBy('outcome')->pluck('total', 'outcome');
            $paymentCounts = Payment::select('payment_status', DB::raw('count(*) as total'))
                ->groupBy('payment_status')->pluck('total', 'payment_status');

            return [
                'total_users'           => $roleCounts->sum(),
                'total_donors'          => $donorCounts->sum(),
                'approved_donors'       => (int) ($donorCounts['approved'] ?? 0),
                'pending_donors'        => (int) ($donorCounts['pending'] ?? 0),
                'total_recipients'      => RecipientProfile::count(),
                'total_matches'         => $matchCounts->sum(),
                'approved_matches'      => (int) ($matchCounts['approved'] ?? 0),
                'proposed_matches'      => (int) ($matchCounts['proposed'] ?? 0),
                'total_donation_cycles' => $cycleCounts->sum(),
                'active_cycles'         => (int) ($cycleCounts['pending'] ?? 0),
                'successful_cycles'     => (int) ($cycleCounts['successful'] ?? 0),
                'total_payments'        => $paymentCounts->sum(),
                'pending_payments'      => (int) ($paymentCounts['pending'] ?? 0),
                'completed_payments'    => (int) ($paymentCounts['completed'] ?? 0),
                'users_by_role'         => [
                    'admin'     => (int) ($roleCounts['admin'] ?? 0),
                    'clinician' => (int) ($roleCounts['clinician'] ?? 0),
                    'donor'     => (int) ($roleCounts['donor'] ?? 0),
                    'recipient' => (int) ($roleCounts['recipient'] ?? 0),
                ],
            ];
        });

        return response()->json($data);
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
        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to . ' 23:59:59');
        }

        return response()->json($query->paginate(25));
    }

    /**
     * Generate a downloadable CSV report of audit logs.
     */
    public function auditLogsReport(Request $request)
    {
        $query = AuditLog::with('user')->orderBy('created_at', 'desc');

        if ($request->has('action') && $request->action) {
            $query->where('action', 'like', '%' . $request->action . '%');
        }
        if ($request->has('date_from') && $request->date_from) {
            $query->where('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->where('created_at', '<=', $request->date_to . ' 23:59:59');
        }

        $logs = $query->get();

        // Log that a report was generated
        AuditLog::create([
            'user_id'       => $request->user()->id,
            'action'        => 'audit_report.generated',
            'resource_type' => 'AuditLog',
            'resource_id'   => 0,
            'new_values'    => [
                'total_records' => $logs->count(),
                'filters'       => $request->only(['action', 'date_from', 'date_to']),
            ],
            'ip_address'    => $request->ip(),
            'user_agent'    => $request->userAgent(),
        ]);

        $filename = 'EDRMS_Audit_Report_' . now()->format('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($logs) {
            $file = fopen('php://output', 'w');

            // CSV header row
            fputcsv($file, [
                'ID', 'Date/Time', 'User', 'Role', 'Action',
                'Resource Type', 'Resource ID',
                'Old Values', 'New Values',
                'IP Address', 'User Agent',
            ]);

            foreach ($logs as $log) {
                fputcsv($file, [
                    $log->id,
                    $log->created_at?->format('Y-m-d H:i:s'),
                    $log->user ? "{$log->user->first_name} {$log->user->last_name}" : 'System',
                    $log->user?->role ?? 'N/A',
                    $log->action,
                    $log->resource_type,
                    $log->resource_id,
                    $log->old_values ? json_encode($log->old_values) : '',
                    $log->new_values ? json_encode($log->new_values) : '',
                    $log->ip_address,
                    $log->user_agent,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
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
