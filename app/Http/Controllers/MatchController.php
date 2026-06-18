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
            'matches' => collect($savedMatches)->map(function ($m) use ($user) {
                $m->load(['donor.user', 'recipient.user']);
                return $this->maskMatch($m, $user);
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
                  ->whereIn('status', ['proposed', 'clinician_review', 'approved', 'completed']);
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

        $matches->getCollection()->transform(function ($match) use ($user) {
            return $this->maskMatch($match, $user);
        });

        return response()->json($matches);
    }

    /**
     * Show a single match with full breakdown.
     */
    public function show(Request $request, $id)
    {
        $match = MatchResult::with(['donor.user', 'recipient.user', 'reviewer'])->findOrFail($id);
        $this->maskMatch($match, $request->user());
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

        $loadedMatch = $match->fresh()->load(['donor.user', 'recipient.user', 'reviewer']);
        $this->maskMatch($loadedMatch, $user);

        return response()->json([
            'message' => 'Match ' . $validated['status'],
            'match' => $loadedMatch,
        ]);
    }

    /**
     * Recipient review — accept or reject a matched donor.
     */
    public function recipientReview(Request $request, $id)
    {
        $user = $request->user();

        if ($user->role !== 'recipient') {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $recipientProfile = RecipientProfile::where('user_id', $user->id)->firstOrFail();
        $match = MatchResult::where('id', $id)->where('recipient_id', $recipientProfile->id)->firstOrFail();

        if (!in_array($match->status, ['approved', 'completed'])) {
            return response()->json(['message' => 'Match is not in a state that can be reviewed by recipient.'], 422);
        }

        $validated = $request->validate([
            'recipient_status' => 'required|in:accepted,rejected',
        ]);

        $old = $match->recipient_status;
        $match->update([
            'recipient_status' => $validated['recipient_status'],
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'match.recipient_reviewed',
            'resource_type' => 'Match',
            'resource_id' => $match->id,
            'old_values' => ['recipient_status' => $old],
            'new_values' => ['recipient_status' => $validated['recipient_status']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $loadedMatch = $match->fresh()->load(['donor.user', 'recipient.user', 'reviewer']);
        $this->maskMatch($loadedMatch, $user);

        return response()->json([
            'message' => 'Match ' . $validated['recipient_status'] . ' by recipient.',
            'match' => $loadedMatch,
        ]);
    }

    /**
     * Helper to mask PII according to user role.
     */
    private function maskMatch(MatchResult $match, $user)
    {
        if (in_array($user->role, ['donor', 'recipient'])) {
            if ($match->donor) {
                if ($match->donor->user) {
                    $match->donor->user->first_name = 'Donor';
                    $match->donor->user->last_name = $match->donor->donor_code;
                    $hiddenUserFields = ['email', 'phone', 'date_of_birth'];
                    if ($user->role !== 'recipient') {
                        $hiddenUserFields[] = 'avatar';
                    }
                    $match->donor->user->makeHidden($hiddenUserFields);
                }
                $hiddenProfileFields = ['date_of_birth', 'medical_history', 'family_medical_history'];
                if ($user->role !== 'recipient') {
                    $hiddenProfileFields[] = 'photo_path';
                }
                $match->donor->makeHidden($hiddenProfileFields);
            }
            if ($match->recipient) {
                if ($match->recipient->user) {
                    $match->recipient->user->first_name = 'Recipient';
                    $match->recipient->user->last_name = $match->recipient->recipient_code;
                    $match->recipient->user->makeHidden(['email', 'phone', 'date_of_birth', 'avatar']);
                }
                $match->recipient->makeHidden(['diagnosis', 'treatment_history']);
            }
        } elseif ($user->role === 'admin') {
            // Admins see names and codes but not photo (avatar/photo_path), phone, date_of_birth
            if ($match->donor) {
                if ($match->donor->user) {
                    $match->donor->user->makeHidden(['phone', 'date_of_birth', 'avatar']);
                }
                $match->donor->makeHidden(['photo_path', 'date_of_birth']);
            }
            if ($match->recipient) {
                if ($match->recipient->user) {
                    $match->recipient->user->makeHidden(['phone', 'date_of_birth', 'avatar']);
                }
            }
        }
        return $match;
    }
}
