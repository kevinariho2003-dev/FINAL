<?php

namespace App\Http\Controllers;

use App\Models\MatchResult;
use App\Models\DonorProfile;
use App\Models\RecipientProfile;
use App\Models\AuditLog;
use App\Services\Matching\HardFilterService;
use App\Services\Matching\ScoringService;
use Illuminate\Http\Request;

class MatchController extends Controller
{
    /**
     * Generate matches for a recipient — core matching pipeline.
     */
    public function generate(Request $request, $recipientId)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'clinician'])) {
            return response()->json(['message' => 'Only clinicians/admins can generate matches.'], 403);
        }

        $recipient = RecipientProfile::findOrFail($recipientId);
        $donors = DonorProfile::where('status', 'approved')
            ->where('availability_status', 'available')
            ->get();

        $hardFilter = new HardFilterService();
        $scorer = new ScoringService();
        $results = [];

        foreach ($donors as $donor) {
            // Step 1: Hard Filters
            $filterResult = $hardFilter->apply($donor, $recipient);

            if (!$filterResult['passed']) {
                continue; // Excluded
            }

            // Step 2: MCDA Scoring
            $scoreResult = $scorer->score($donor, $recipient);

            $results[] = [
                'donor_id' => $donor->id,
                'donor_code' => $donor->donor_code,
                'score' => $scoreResult['composite_score'],
                'breakdown' => $scoreResult['breakdown'],
            ];
        }

        // Step 3: Sort by score descending
        usort($results, fn($a, $b) => $b['score'] <=> $a['score']);

        // Step 4: Save top matches (max 10)
        $topResults = array_slice($results, 0, 10);
        $savedMatches = [];

        foreach ($topResults as $result) {
            // Check if match already exists
            $existing = MatchResult::where('recipient_id', $recipient->id)
                ->where('donor_id', $result['donor_id'])
                ->whereIn('status', ['proposed', 'clinician_review', 'approved'])
                ->first();

            if ($existing) {
                // Update score
                $existing->update([
                    'match_score' => $result['score'],
                    'score_breakdown' => $result['breakdown'],
                ]);
                $savedMatches[] = $existing;
            } else {
                $match = MatchResult::create([
                    'recipient_id' => $recipient->id,
                    'donor_id' => $result['donor_id'],
                    'match_score' => $result['score'],
                    'score_breakdown' => $result['breakdown'],
                    'hard_filter_passed' => true,
                    'status' => 'proposed',
                    'matched_by' => 'system',
                ]);
                $savedMatches[] = $match;
            }
        }

        // Audit
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'match.generated',
            'resource_type' => 'RecipientProfile',
            'resource_id' => $recipient->id,
            'new_values' => [
                'total_donors_evaluated' => $donors->count(),
                'passed_hard_filter' => count($results),
                'matches_saved' => count($savedMatches),
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Matching complete',
            'summary' => [
                'donors_evaluated' => $donors->count(),
                'passed_hard_filter' => count($results),
                'matches_saved' => count($savedMatches),
            ],
            'matches' => collect($savedMatches)->map(function ($m) {
                return $m->load(['donor.user', 'recipient.user']);
            }),
        ]);
    }

    /**
     * List matches — filtered by role.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = MatchResult::with(['donor.user', 'recipient.user', 'reviewer']);

        if ($user->role === 'recipient') {
            $recipientProfile = RecipientProfile::where('user_id', $user->id)->first();
            if (!$recipientProfile) return response()->json([]);
            $query->where('recipient_id', $recipientProfile->id)
                  ->where('status', 'approved'); // Recipients only see approved
        } elseif ($user->role === 'donor') {
            $donorProfile = DonorProfile::where('user_id', $user->id)->first();
            if (!$donorProfile) return response()->json([]);
            $query->where('donor_id', $donorProfile->id)
                  ->where('status', 'approved');
        } else {
            // Clinician/admin see all
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
            if ($request->has('recipient_id')) {
                $query->where('recipient_id', $request->recipient_id);
            }
        }

        $matches = $query->orderBy('match_score', 'desc')->paginate(20);
        return response()->json($matches);
    }

    /**
     * Show a single match with full breakdown.
     */
    public function show(Request $request, $id)
    {
        $match = MatchResult::with(['donor.user', 'recipient.user', 'reviewer'])->findOrFail($id);
        return response()->json($match);
    }

    /**
     * Clinician review — approve or reject a match.
     */
    public function review(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'clinician'])) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'review_notes' => 'nullable|string|max:2000',
        ]);

        $match = MatchResult::findOrFail($id);
        $old = $match->status;

        $match->update([
            'status' => $validated['status'],
            'review_notes' => $validated['review_notes'] ?? null,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'match.reviewed',
            'resource_type' => 'Match',
            'resource_id' => $match->id,
            'old_values' => ['status' => $old],
            'new_values' => ['status' => $validated['status']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Match ' . $validated['status'],
            'match' => $match->fresh()->load(['donor.user', 'recipient.user', 'reviewer']),
        ]);
    }
}
