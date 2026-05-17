<?php

namespace App\Http\Controllers;

use App\Models\DonorProfile;
use App\Models\Consultation;
use App\Models\User;
use App\Models\RecipientProfile;
use App\Models\MatchResult;
use Illuminate\Http\Request;



class ClinicianController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Dashboard Overview with counts matched to your logic requirements.
     */
    public function getDashboardOverview(Request $request)
    {
        try {
            // 1. Pending Consultations: Donors who requested consultation
            $pendingConsultations = Consultation::where('status', 'pending')->count();
            
            // 2. Pending Donor Approvals: Completed profile, waiting approval
            $pendingDonorApprovals = DonorProfile::where('stage', 'profile_completion')
                ->where('approval_status', 'pending')
                ->count();
            
            // 3. Scheduled Appointments: Profile approved, waiting for physical
            $scheduledAppointments = DonorProfile::where('stage', 'physical_appointment')
                ->where('approval_status', 'pending')
                ->count();
            
            // 4. Active Donors: Passed physical (approved at physical stage or beyond)
            $activeDonors = DonorProfile::where(function ($q) {
                $q->where(function ($sub) {
                    $sub->where('stage', 'physical_appointment')
                        ->where('approval_status', 'approved');
                })->orWhereIn('stage', ['injection_phase', 'retrieval', 'final_payment']);
            })->count();

            $matchesForReview = class_exists(MatchResult::class) ? MatchResult::where('status', 'proposed')->count() : 0;

            return response()->json([
                'success' => true,
                'summary' => [
                    'pendingConsultations' => $pendingConsultations,
                    'pendingDonors' => $pendingDonorApprovals,
                    'scheduledAppointments' => $scheduledAppointments,
                    'activeDonors' => $activeDonors,
                    'matchesForReview' => $matchesForReview,
                    'activeRecipients' => RecipientProfile::count(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Helper to apply search and filters to DonorProfile queries
     */
    private function applyDonorFilters($query, Request $request)
    {
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('donor_code', 'like', "%{$search}%")
                  ->orWhereHas('user', function($uq) use ($search) {
                      $uq->where('first_name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('approval_status')) {
            $query->where('approval_status', $request->approval_status);
        }

        return $query->with('user')->latest();
    }

    public function getConsultations(Request $request)
    {
        $query = Consultation::with('donor.user')->where('status', 'pending');
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($main) use ($search) {
            $main->whereHas('donor.user', function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%");
            });
            $main->orWhereHas('donor', function($q) use ($search) {
                $q->where('donor_code', 'like', "%{$search}%");
            });
        });
        }
        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    public function getPendingProfiles(Request $request)
    {
        $query = DonorProfile::where('stage', 'profile_completion')
            ->where('approval_status', 'pending');

        return response()->json([
            'success' => true,
            'data' => $this->applyDonorFilters($query, $request)->get()
        ]);
    }

    public function getAwaitingPhysical(Request $request)
    {
        $query = DonorProfile::where('stage', 'physical_appointment')->where('approval_status', 'pending');
        return response()->json(['success' => true, 'data' => $this->applyDonorFilters($query, $request)->get()]);
    }

    public function getActiveDonors(Request $request)
    {
        $query = DonorProfile::where(function($q) {
            $q->where(function($sub) {
                $sub->where('stage', 'physical_appointment')
                    ->where('approval_status', 'approved');
            })
            ->orWhereIn('stage', [
                'injection_phase',
                'retrieval',
                'final_payment'
            ]);
        });

        return response()->json([
            'success' => true,
            'data' => $this->applyDonorFilters($query, $request)->get()
        ]);
    }
}
