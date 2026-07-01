<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DonorController;
use App\Http\Controllers\RecipientController;
use App\Http\Controllers\MatchController;
use App\Http\Controllers\ConsentController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ScreeningController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\DonationCycleController;
use App\Http\Controllers\DonorQuestionnaireController;
use App\Http\Controllers\PaymentController;

/*
|--------------------------------------------------------------------------
| API Routes — EDRMS
|--------------------------------------------------------------------------
*/

// ── Public (no auth) ──
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);
// OTP email verification
Route::post('/auth/google',      [AuthController::class, 'googleLogin']);
Route::post('/auth/verify-otp',  [AuthController::class, 'verifyOtp']);
Route::post('/auth/resend-otp',  [AuthController::class, 'resendOtp']);
Route::get('/auth/dev/otp',      [AuthController::class, 'devOtp']);   // local env only
// Flutterwave callback — must be public (Flutterwave calls this)
Route::get('/payments/callback', [PaymentController::class, 'callback']);

// ── Authenticated ──
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/users/avatar', [UserController::class, 'uploadAvatar']);

    // ── Donors ──
    Route::get('/donors', [DonorController::class, 'index']);
    Route::post('/donors', [DonorController::class, 'store']);
    Route::get('/donors/{id}', [DonorController::class, 'show']);
    Route::put('/donors/{id}', [DonorController::class, 'update']);
    Route::patch('/donors/{id}/status', [DonorController::class, 'updateStatus'])
         ->middleware('role:clinician');
    Route::post('/donors/{id}/photo', [DonorController::class, 'uploadPhoto']);

    // ── Donor Questionnaire ──
    Route::get('/questionnaire', [DonorQuestionnaireController::class, 'index']);
    Route::get('/questionnaire/{phaseId}', [DonorQuestionnaireController::class, 'show']);
    Route::put('/questionnaire/{phaseId}', [DonorQuestionnaireController::class, 'update']);
    Route::post('/questionnaire/submit', [DonorQuestionnaireController::class, 'submit']);
    Route::post('/questionnaire/reset', [DonorQuestionnaireController::class, 'reset']);

    // ── Screening Documents ──
    Route::get('/donors/{donorId}/screening-documents', [ScreeningController::class, 'index']);
    Route::post('/donors/{donorId}/screening-documents', [ScreeningController::class, 'store']);
    Route::patch('/screening-documents/{id}/review', [ScreeningController::class, 'review'])
         ->middleware('role:clinician');
    Route::delete('/screening-documents/{id}', [ScreeningController::class, 'destroy']);

    // ── Appointments ──
    Route::get('/donors/{donorId}/appointments', [AppointmentController::class, 'index']);
    Route::post('/donors/{donorId}/appointments', [AppointmentController::class, 'store']);
    Route::post('/clinician/schedule-appointment', [AppointmentController::class, 'clinicianStore'])->middleware('role:clinician');
    Route::patch('/appointments/{id}/status', [AppointmentController::class, 'updateStatus'])->middleware('role:admin,clinician');
    Route::post('/appointments/{id}/complete', [AppointmentController::class, 'completeAppointment'])->middleware('role:admin,clinician');
    Route::delete('/appointments/{id}', [AppointmentController::class, 'destroy']);

    // ── Recipients ──
    Route::get('/recipients', [RecipientController::class, 'index']);
    Route::post('/recipients', [RecipientController::class, 'store']);
    Route::get('/recipients/{id}', [RecipientController::class, 'show']);
    Route::put('/recipients/{id}', [RecipientController::class, 'update']);
    Route::patch('/recipients/{id}/status', [RecipientController::class, 'updateStatus'])
         ->middleware('role:clinician');

    // ── Matching ──
    Route::post('/matches/generate/{recipientId}', [MatchController::class, 'generate'])
         ->middleware('role:clinician');
    Route::get('/matches', [MatchController::class, 'index']);
    Route::get('/matches/{id}', [MatchController::class, 'show']);
    Route::patch('/matches/{id}/review', [MatchController::class, 'review'])
         ->middleware('role:clinician');
    Route::patch('/matches/{id}/recipient-review', [MatchController::class, 'recipientReview']);

    // ── Donation Cycles ──
    Route::get('/donation-cycles', [DonationCycleController::class, 'index']);
    Route::post('/donation-cycles', [DonationCycleController::class, 'store'])
         ->middleware('role:clinician');
    Route::get('/donation-cycles/{id}', [DonationCycleController::class, 'show']);
    Route::put('/donation-cycles/{id}', [DonationCycleController::class, 'update'])
         ->middleware('role:clinician');

    // ── Medications (within cycles) ──
    Route::post('/donation-cycles/{cycleId}/medications', [DonationCycleController::class, 'addMedication'])
         ->middleware('role:clinician');
    Route::delete('/medications/{id}', [DonationCycleController::class, 'removeMedication'])
         ->middleware('role:clinician');

    // ── Payments ──
    // Role checks are handled inside the controller (recipient=service_fee only; clinician/admin=all stages)
    Route::get('/payments',                    [PaymentController::class, 'index']);
    Route::post('/payments',                   [PaymentController::class, 'store']);
    Route::post('/payments/initiate',          [PaymentController::class, 'initiate']);
    Route::patch('/payments/{id}/status',      [PaymentController::class, 'updateStatus'])->middleware('role:admin,clinician');

    // ── Consents ──
    Route::get('/consents', [ConsentController::class, 'index']);
    Route::post('/consents', [ConsentController::class, 'store']);
    Route::patch('/consents/{id}/revoke', [ConsentController::class, 'revoke']);

    // ── Admin ──
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/statistics', [AdminController::class, 'statistics']);
        Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
        Route::get('/audit-logs/report', [AdminController::class, 'auditLogsReport']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::patch('/users/{id}/toggle', [AdminController::class, 'toggleUserStatus']);
        Route::get('/matching-weights', [AdminController::class, 'getWeights']);
        Route::put('/matching-weights', [AdminController::class, 'updateWeights']);
        Route::post('/clinicians', [AdminController::class, 'createClinician']);
        // pending-donors review moved to clinician scope (via /donors endpoint)
    });

    Route::get('/clinician/action-items', [\App\Http\Controllers\ClinicianActionController::class, 'getActionItems'])->middleware('role:admin,clinician');
});
