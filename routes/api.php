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
use App\Http\Controllers\PaymentController;

/*
|--------------------------------------------------------------------------
| API Routes — EDRMS
|--------------------------------------------------------------------------
*/

// ── Public (no auth) ──
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

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
         ->middleware('role:admin,clinician');
    Route::post('/donors/{id}/photo', [DonorController::class, 'uploadPhoto']);

    // ── Screening Documents ──
    Route::get('/donors/{donorId}/screening-documents', [ScreeningController::class, 'index']);
    Route::post('/donors/{donorId}/screening-documents', [ScreeningController::class, 'store']);
    Route::patch('/screening-documents/{id}/review', [ScreeningController::class, 'review'])
         ->middleware('role:admin,clinician');
    Route::delete('/screening-documents/{id}', [ScreeningController::class, 'destroy']);

    // ── Appointments ──
    Route::get('/donors/{donorId}/appointments', [AppointmentController::class, 'index']);
    Route::post('/donors/{donorId}/appointments', [AppointmentController::class, 'store']);
    Route::patch('/appointments/{id}/status', [AppointmentController::class, 'updateStatus'])
         ->middleware('role:admin,clinician');
    Route::delete('/appointments/{id}', [AppointmentController::class, 'destroy']);

    // ── Recipients ──
    Route::get('/recipients', [RecipientController::class, 'index']);
    Route::post('/recipients', [RecipientController::class, 'store']);
    Route::get('/recipients/{id}', [RecipientController::class, 'show']);
    Route::put('/recipients/{id}', [RecipientController::class, 'update']);
    Route::patch('/recipients/{id}/status', [RecipientController::class, 'updateStatus'])
         ->middleware('role:admin,clinician');

    // ── Matching ──
    Route::post('/matches/generate/{recipientId}', [MatchController::class, 'generate'])
         ->middleware('role:admin,clinician');
    Route::get('/matches', [MatchController::class, 'index']);
    Route::get('/matches/{id}', [MatchController::class, 'show']);
    Route::patch('/matches/{id}/review', [MatchController::class, 'review'])
         ->middleware('role:admin,clinician');

    // ── Donation Cycles ──
    Route::get('/donation-cycles', [DonationCycleController::class, 'index']);
    Route::post('/donation-cycles', [DonationCycleController::class, 'store'])
         ->middleware('role:admin,clinician');
    Route::get('/donation-cycles/{id}', [DonationCycleController::class, 'show']);
    Route::put('/donation-cycles/{id}', [DonationCycleController::class, 'update'])
         ->middleware('role:admin,clinician');

    // ── Medications (within cycles) ──
    Route::post('/donation-cycles/{cycleId}/medications', [DonationCycleController::class, 'addMedication'])
         ->middleware('role:admin,clinician');
    Route::delete('/medications/{id}', [DonationCycleController::class, 'removeMedication'])
         ->middleware('role:admin,clinician');

    // ── Payments ──
    Route::post('/payments', [PaymentController::class, 'store'])
         ->middleware('role:admin,clinician');
    Route::patch('/payments/{id}/status', [PaymentController::class, 'updateStatus'])
         ->middleware('role:admin');

    // ── Consents ──
    Route::get('/consents', [ConsentController::class, 'index']);
    Route::post('/consents', [ConsentController::class, 'store']);
    Route::patch('/consents/{id}/revoke', [ConsentController::class, 'revoke']);

    // ── Admin ──
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/statistics', [AdminController::class, 'statistics']);
        Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::patch('/users/{id}/toggle', [AdminController::class, 'toggleUserStatus']);
        Route::get('/matching-weights', [AdminController::class, 'getWeights']);
        Route::put('/matching-weights', [AdminController::class, 'updateWeights']);
        Route::post('/clinicians', [AdminController::class, 'createClinician']);
        Route::get('/pending-donors', [AdminController::class, 'pendingDonors']);
    });
});
