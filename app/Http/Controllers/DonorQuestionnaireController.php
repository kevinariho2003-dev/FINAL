<?php

namespace App\Http\Controllers;

use App\Models\DonorQuestionnairePhase;
use App\Models\DonorQuestionnaireResponse;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class DonorQuestionnaireController extends Controller
{
    /**
     * Get all questionnaire phases with user's progress.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'donor') {
            return response()->json(['message' => 'Only donors can access questionnaire.'], 403);
        }

        $phases = DonorQuestionnairePhase::ordered()->get();

        // Get user's responses for each phase
        $responses = DonorQuestionnaireResponse::where('user_id', $user->id)
            ->with('phase')
            ->get()
            ->keyBy('phase_id');

        $phasesWithProgress = $phases->map(function ($phase) use ($responses) {
            $response = $responses->get($phase->id);

            return [
                'id' => $phase->id,
                'phase_key' => $phase->phase_key,
                'phase_name' => $phase->phase_name,
                'description' => $phase->description,
                'order' => $phase->order,
                'is_required' => $phase->is_required,
                'validation_rules' => $phase->validation_rules,
                'progress' => [
                    'status' => $response ? $response->status : 'not_started',
                    'completed_at' => $response ? $response->completed_at : null,
                    'is_completed' => $response ? $response->isCompleted() : false,
                ],
                'responses' => $response ? $response->responses : null,
            ];
        });

        return response()->json([
            'phases' => $phasesWithProgress,
            'overall_progress' => $this->calculateOverallProgress($responses, $phases),
        ]);
    }

    /**
     * Get a specific phase with user's current responses.
     */
    public function show(Request $request, $phaseId)
    {
        $user = $request->user();

        if ($user->role !== 'donor') {
            return response()->json(['message' => 'Only donors can access questionnaire.'], 403);
        }

        $phase = DonorQuestionnairePhase::findOrFail($phaseId);

        $response = DonorQuestionnaireResponse::where('user_id', $user->id)
            ->where('phase_id', $phaseId)
            ->first();

        return response()->json([
            'phase' => $phase,
            'responses' => $response ? $response->responses : null,
            'status' => $response ? $response->status : 'not_started',
        ]);
    }

    /**
     * Save/update responses for a specific phase.
     */
    public function update(Request $request, $phaseId)
    {
        $user = $request->user();

        if ($user->role !== 'donor') {
            return response()->json(['message' => 'Only donors can access questionnaire.'], 403);
        }

        $phase = DonorQuestionnairePhase::findOrFail($phaseId);

        // Validate responses against phase rules
        $validator = Validator::make($request->all(), $phase->validation_rules ?? []);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $responses = $request->all();

        // Find or create response record
        $response = DonorQuestionnaireResponse::updateOrCreate(
            [
                'user_id' => $user->id,
                'phase_id' => $phaseId,
            ],
            [
                'responses' => $responses,
                'status' => 'completed',
                'completed_at' => now(),
            ]
        );

        // Audit log
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'questionnaire.phase.updated',
            'resource_type' => 'DonorQuestionnaireResponse',
            'resource_id' => $response->id,
            'old_values' => $response->getOriginal(),
            'new_values' => $response->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Phase responses saved successfully',
            'response' => $response->load('phase'),
        ]);
    }

    /**
     * Submit the entire questionnaire (mark all phases as submitted).
     */
    public function submit(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'donor') {
            return response()->json(['message' => 'Only donors can submit questionnaire.'], 403);
        }

        // Check if all required phases are completed
        $phases = DonorQuestionnairePhase::required()->get();
        $responses = DonorQuestionnaireResponse::where('user_id', $user->id)
            ->whereIn('phase_id', $phases->pluck('id'))
            ->where('status', 'completed')
            ->count();

        if ($responses < $phases->count()) {
            return response()->json([
                'message' => 'All required phases must be completed before submission.',
                'completed_phases' => $responses,
                'required_phases' => $phases->count(),
            ], 400);
        }

        // Mark all responses as submitted
        DonorQuestionnaireResponse::where('user_id', $user->id)
            ->update([
                'status' => 'submitted',
                'completed_at' => now(),
            ]);

        // Create donor profile from questionnaire responses
        $this->createDonorProfileFromQuestionnaire($user);

        // Audit log
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'questionnaire.submitted',
            'resource_type' => 'DonorQuestionnaire',
            'resource_id' => $user->id,
            'new_values' => ['status' => 'submitted'],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Questionnaire submitted successfully. Your donor profile has been created and is pending review.',
        ]);
    }

    /**
     * Reset questionnaire (for testing or if donor wants to start over).
     */
    public function reset(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'donor') {
            return response()->json(['message' => 'Only donors can reset questionnaire.'], 403);
        }

        // Only allow reset if profile hasn't been approved yet
        $profile = $user->donorProfile;
        if ($profile && $profile->status !== 'pending') {
            return response()->json([
                'message' => 'Cannot reset questionnaire after profile has been reviewed.',
            ], 400);
        }

        DonorQuestionnaireResponse::where('user_id', $user->id)->delete();

        // Audit log
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'questionnaire.reset',
            'resource_type' => 'DonorQuestionnaire',
            'resource_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Questionnaire reset successfully.',
        ]);
    }

    /**
     * Calculate overall questionnaire progress.
     */
    private function calculateOverallProgress($responses, $phases)
    {
        $totalPhases = $phases->count();
        $completedPhases = $responses->filter(fn($r) => $r->isCompleted())->count();
        $requiredPhases = $phases->where('is_required', true)->count();
        $completedRequired = $responses->filter(fn($r) => $r->isCompleted() && $r->phase->is_required)->count();

        return [
            'total_phases' => $totalPhases,
            'completed_phases' => $completedPhases,
            'completion_percentage' => $totalPhases > 0 ? round(($completedPhases / $totalPhases) * 100, 1) : 0,
            'required_phases' => $requiredPhases,
            'completed_required' => $completedRequired,
            'can_submit' => $completedRequired >= $requiredPhases,
        ];
    }

    /**
     * Create donor profile from completed questionnaire responses.
     */
    private function createDonorProfileFromQuestionnaire($user)
    {
        // Aggregate all responses
        $allResponses = DonorQuestionnaireResponse::where('user_id', $user->id)
            ->with('phase')
            ->get()
            ->pluck('responses', 'phase.phase_key')
            ->toArray();

        // Flatten responses into profile data
        $profileData = [];
        foreach ($allResponses as $phaseKey => $responses) {
            $profileData = array_merge($profileData, $responses);
        }

        // Calculate BMI if height and weight provided
        $bmi = null;
        if (!empty($profileData['height_cm']) && !empty($profileData['weight_kg'])) {
            $heightM = $profileData['height_cm'] / 100;
            $bmi = round($profileData['weight_kg'] / ($heightM * $heightM), 1);
        }

        // Create or update donor profile
        $profile = $user->donorProfile ?? new \App\Models\DonorProfile();

        $profile->fill([
            'user_id' => $user->id,
            'donor_code' => $profile->donor_code ?? \App\Models\DonorProfile::generateCode(),
            'status' => 'pending',
            'bmi' => $bmi,
            // Map questionnaire fields to profile fields
            ...$profileData,
        ]);

        $profile->save();

        return $profile;
    }
}
