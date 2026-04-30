<?php

namespace App\Http\Controllers;

use App\Models\Consent;
use App\Models\AuditLog;
use App\Models\MatchResult;
use Illuminate\Http\Request;

class ConsentController extends Controller
{
    /**
     * List user's consents.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $consents = Consent::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($consents);
    }

    /**
     * Grant a consent.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'consent_type' => 'required|in:donor_registration,data_sharing,egg_donation,recipient_matching,photo_use',
            'consent_text' => 'required|string',
        ]);

        // Get latest version for this consent type
        $latestVersion = Consent::where('user_id', $user->id)
            ->where('consent_type', $validated['consent_type'])
            ->max('version') ?? 0;

        $consent = Consent::create([
            'user_id' => $user->id,
            'consent_type' => $validated['consent_type'],
            'version' => $latestVersion + 1,
            'status' => 'granted',
            'consent_text' => $validated['consent_text'],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'granted_at' => now(),
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'consent.granted',
            'resource_type' => 'Consent',
            'resource_id' => $consent->id,
            'new_values' => ['consent_type' => $validated['consent_type'], 'version' => $consent->version],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Consent granted',
            'consent' => $consent,
        ], 201);
    }

    /**
     * Revoke a consent — cascades to pause active matches.
     */
    public function revoke(Request $request, $id)
    {
        $user = $request->user();
        $consent = Consent::where('id', $id)->where('user_id', $user->id)->firstOrFail();

        if ($consent->status === 'revoked') {
            return response()->json(['message' => 'Consent already revoked.'], 400);
        }

        $consent->update([
            'status' => 'revoked',
            'revoked_at' => now(),
        ]);

        // Cascade: pause active matches if egg_donation consent revoked
        $pausedMatches = 0;
        if ($consent->consent_type === 'egg_donation') {
            $donorProfile = $user->donorProfile;
            if ($donorProfile) {
                $pausedMatches = MatchResult::where('donor_id', $donorProfile->id)
                    ->whereIn('status', ['proposed', 'clinician_review'])
                    ->update(['status' => 'rejected', 'review_notes' => 'Auto-rejected: donor revoked egg donation consent']);
            }
        }

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'consent.revoked',
            'resource_type' => 'Consent',
            'resource_id' => $consent->id,
            'old_values' => ['status' => 'granted'],
            'new_values' => ['status' => 'revoked', 'paused_matches' => $pausedMatches],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Consent revoked',
            'consent' => $consent->fresh(),
            'paused_matches' => $pausedMatches,
        ]);
    }
}
