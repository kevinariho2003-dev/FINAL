<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DonorController;
use App\Http\Controllers\ClinicianController;
use App\Http\Controllers\RecipientController;
use App\Http\Controllers\MatchController;
use App\Http\Controllers\ConsentController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ScreeningController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\DonationCycleController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\MedicationController;
use App\Http\Controllers\NotificationController;

/*
|--------------------------------------------------------------------------
| API Routes — EDRMS
|--------------------------------------------------------------------------
*/

// ── Public (no auth) ──
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// ── Authenticated (all users) ──
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/users/avatar', [UserController::class, 'uploadAvatar']);

    // ─────────────────────────────────────────────────────────────
    // DONOR ROUTES (Available to all authenticated donors)
    // ─────────────────────────────────────────────────────────────

    Route::get('/donors/me', [DonorController::class, 'getMe']);
    Route::get('/donors', [DonorController::class, 'index']);
    Route::post('/donors', [DonorController::class, 'store']);
    Route::get('/donors/{id}', [DonorController::class, 'show']);
    Route::put('/donors/{id}', [DonorController::class, 'update']);
    Route::post('/donors/{id}/photo', [DonorController::class, 'uploadPhoto']);

    // ✅ CONSULTATION REQUEST - Available to ALL authenticated users (donors!)
    Route::post('/donors/consultation/request', [DonorController::class, 'submitConsultationRequest']);
    Route::post('/donors/consultation-request', [DonorController::class, 'submitConsultationRequest']); // Alternative endpoint

    // Questionnaire
    Route::put('/donors/update-profile', [DonorController::class, 'submitQuestionnaire']);

    // Medications
    Route::get('/medications', [MedicationController::class, 'getDonorMedications']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);

    // ─────────────────────────────────────────────────────────────
    // SCREENING DOCUMENTS
    // ─────────────────────────────────────────────────────────────

    Route::get('/donors/{donorId}/screening-documents', [ScreeningController::class, 'index']);
    Route::post('/donors/{donorId}/screening-documents', [ScreeningController::class, 'store']);
    Route::delete('/screening-documents/{id}', [ScreeningController::class, 'destroy']);

    // ─────────────────────────────────────────────────────────────
    // APPOINTMENTS
    // ─────────────────────────────────────────────────────────────

    Route::get('/donors/{donorId}/appointments', [AppointmentController::class, 'index']);
    Route::post('/donors/{donorId}/appointments', [AppointmentController::class, 'store']);
    Route::delete('/appointments/{id}', [AppointmentController::class, 'destroy']);

    // ─────────────────────────────────────────────────────────────
    // RECIPIENTS
    // ─────────────────────────────────────────────────────────────

    Route::get('/recipients', [RecipientController::class, 'index']);
    Route::post('/recipients', [RecipientController::class, 'store']);
    Route::get('/recipients/{id}', [RecipientController::class, 'show']);
    Route::put('/recipients/{id}', [RecipientController::class, 'update']);

    // ─────────────────────────────────────────────────────────────
    // MATCHING
    // ─────────────────────────────────────────────────────────────

    Route::get('/matches', [MatchController::class, 'index']);
    Route::get('/matches/{id}', [MatchController::class, 'show']);

    // ─────────────────────────────────────────────────────────────
    // DONATION CYCLES
    // ─────────────────────────────────────────────────────────────

    Route::get('/donation-cycles', [DonationCycleController::class, 'index']);
    Route::get('/donation-cycles/{id}', [DonationCycleController::class, 'show']);

    // ─────────────────────────────────────────────────────────────
    // CONSENTS
    // ─────────────────────────────────────────────────────────────

    Route::get('/consents', [ConsentController::class, 'index']);
    Route::post('/consents', [ConsentController::class, 'store']);
    Route::patch('/consents/{id}/revoke', [ConsentController::class, 'revoke']);
});

// ── Clinician/Admin Only Routes ──
Route::middleware(['auth:sanctum', 'role:clinician,admin'])->group(function () {

    // ─────────────────────────────────────────────────────────────
    // CLINICIAN DASHBOARD OVERVIEW
    // ─────────────────────────────────────────────────────────────

    Route::get('/clinician/stats/pending-consultations', [ClinicianController::class, 'getPendingConsultationsCount']);
    Route::get('/clinician/stats/pending-donor-approvals', [ClinicianController::class, 'getPendingDonorApprovalsCount']);
    Route::get('/clinician/stats/scheduled-appointments', [ClinicianController::class, 'getScheduledAppointmentsCount']);
    Route::get('/clinician/stats/matches-for-review', [ClinicianController::class, 'getMatchesForReviewCount']);
    Route::get('/clinician/stats/egg-retrievals', [ClinicianController::class, 'getEggRetrievalsCount']);
    Route::get('/clinician/stats/active-donors', [ClinicianController::class, 'getActiveDonorsCount']);
    Route::get('/clinician/stats/active-recipients', [ClinicianController::class, 'getActiveRecipientsCount']);
    

    Route::get('/clinician/dashboard', [ClinicianController::class, 'getDashboardOverview']);

    // ─────────────────────────────────────────────────────────────
    // DONOR MANAGEMENT BY STAGE (ADD THESE NEW ROUTES)
    // ─────────────────────────────────────────────────────────────

    Route::get('/donors/consultations', [ClinicianController::class, 'getConsultations']);
    Route::get('/donors/pending-profiles', [ClinicianController::class, 'getPendingProfileApprovals']);
    Route::get('/donors/awaiting-physical', [ClinicianController::class, 'getAwaitingPhysical']);
    Route::get('/donors/active-donors', [ClinicianController::class, 'getActiveDonors']);
    Route::get('/donors/stage', [ClinicianController::class, 'getDonorsByStage']);


    // ─────────────────────────────────────────────────────────────
    // CONSULTATIONS MANAGEMENT
    // ─────────────────────────────────────────────────────────────

    Route::patch('/donors/{id}/consultation-status', [ClinicianController::class, 'updateConsultationStatus']);

    // ─────────────────────────────────────────────────────────────
    // DONOR WORKFLOW MANAGEMENT
    // ─────────────────────────────────────────────────────────────

    Route::get('/donors/{id}/complete', [ClinicianController::class, 'getDonorComplete']);
    Route::patch('/donors/{id}/approval-status', [ClinicianController::class, 'updateApprovalStatus']);

    // Status updates (clinician only)
    Route::patch('/donors/{id}/status', [DonorController::class, 'updateStatus']);

    // ─────────────────────────────────────────────────────────────
    // SCREENING DOCUMENTS (CLINICIAN REVIEW)
    // ─────────────────────────────────────────────────────────────

    Route::get('/donors/{id}/screening-documents', [ClinicianController::class, 'getScreeningDocuments']);
    Route::patch('/screening-documents/{id}/review', [ClinicianController::class, 'reviewDocument']);

    // ─────────────────────────────────────────────────────────────
    // APPOINTMENTS (CLINICIAN MANAGEMENT)
    // ─────────────────────────────────────────────────────────────

    Route::get('/donors/{id}/appointments', [ClinicianController::class, 'getAppointments']);
    Route::patch('/appointments/{id}/status', [ClinicianController::class, 'updateAppointmentStatus']);

    // ─────────────────────────────────────────────────────────────
    // RECIPIENT MANAGEMENT
    // ─────────────────────────────────────────────────────────────

    Route::patch('/recipients/{id}/status', [RecipientController::class, 'updateStatus']);

    // ─────────────────────────────────────────────────────────────
    // MATCHING MANAGEMENT
    // ─────────────────────────────────────────────────────────────

    Route::post('/matches/generate/{recipientId}', [MatchController::class, 'generate']);
    Route::patch('/matches/{id}/review', [MatchController::class, 'review']);

    // ─────────────────────────────────────────────────────────────
    // DONATION CYCLES (CLINICIAN/ADMIN)
    // ─────────────────────────────────────────────────────────────

    Route::post('/donation-cycles', [DonationCycleController::class, 'store']);
    Route::put('/donation-cycles/{id}', [DonationCycleController::class, 'update']);
    Route::post('/donation-cycles/{cycleId}/medications', [DonationCycleController::class, 'addMedication']);
    Route::delete('/medications/{id}', [DonationCycleController::class, 'removeMedication']);

    // ─────────────────────────────────────────────────────────────
    // PAYMENTS
    // ─────────────────────────────────────────────────────────────

    Route::post('/payments', [PaymentController::class, 'store']);
    Route::patch('/payments/{id}/status', [PaymentController::class, 'updateStatus']);
});

// ── Admin Only Routes ──
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/statistics', [AdminController::class, 'statistics']);
    Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
    Route::get('/users', [AdminController::class, 'users']);
    Route::patch('/users/{id}/toggle', [AdminController::class, 'toggleUserStatus']);
    Route::get('/matching-weights', [AdminController::class, 'getWeights']);
    Route::put('/matching-weights', [AdminController::class, 'updateWeights']);
    Route::post('/clinicians', [AdminController::class, 'createClinician']);
    Route::get('/pending-donors', [AdminController::class, 'pendingDonors']);
});
