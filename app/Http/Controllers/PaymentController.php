<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\DonationCycle;
use App\Models\AuditLog;
use App\Services\FlutterwaveService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function __construct(private FlutterwaveService $flw) {}

    /* ══════════════════════════════════════════
     | 1. Manual record (legacy — still works)
     ══════════════════════════════════════════ */

    public function store(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'clinician'])) {
            return response()->json(['message' => 'Only clinicians/admins can record compensation payments.'], 403);
        }

        $validated = $request->validate([
            'cycle_id'       => 'required|exists:donation_cycles,id',
            'amount'         => 'required|numeric|min:0',
            'payment_method' => 'sometimes|in:bank_transfer,mobile_money,cash,cheque',
            'payment_stage'  => 'required|in:initial,final,service_fee,recipient_initial,recipient_final,donor_initial,donor_final',
            'notes'          => 'nullable|string|max:500',
        ]);

        $cycle = DonationCycle::with(['donor.user', 'recipient.user'])->findOrFail($validated['cycle_id']);

        if ($user->role === 'recipient') {
            $recipientProfile = \App\Models\RecipientProfile::where('user_id', $user->id)->first();
            if (!$recipientProfile || $cycle->recipient_id !== $recipientProfile->id) {
                return response()->json(['message' => 'Access denied.'], 403);
            }
            if (!in_array($validated['payment_stage'], ['service_fee', 'recipient_initial', 'recipient_final'])) {
                return response()->json(['message' => 'Recipients can only initiate recipient payments.'], 403);
            }
        }

        // Prevent duplicate per stage
        $existingStage = Payment::where('cycle_id', $cycle->id)
            ->where('payment_stage', $validated['payment_stage'])
            ->whereIn('payment_status', ['pending', 'processing', 'completed'])
            ->first();

        if ($existingStage) {
            return response()->json([
                'message' => "A {$validated['payment_stage']} compensation already exists for this cycle (status: {$existingStage->payment_status})."
            ], 409);
        }

        $payment = Payment::create([
            'donor_id'       => $cycle->donor_id,
            'cycle_id'       => $cycle->id,
            'amount'         => $validated['amount'],
            'payment_method' => $validated['payment_method'] ?? 'bank_transfer',
            'payment_stage'  => $validated['payment_stage'],
            'payment_status' => 'completed',
            'payment_date'   => now()->toDateString(),
            'reference_number' => Payment::generateReference(),
            'notes'          => $validated['notes'] ?? null,
        ]);

        AuditLog::create([
            'user_id'       => $user->id,
            'action'        => 'compensation.recorded',
            'resource_type' => 'Payment',
            'resource_id'   => $payment->id,
            'new_values'    => $payment->toArray(),
            'ip_address'    => $request->ip(),
            'user_agent'    => $request->userAgent(),
        ]);

        return response()->json([
            'message' => ucfirst($validated['payment_stage']) . ' compensation recorded successfully.',
            'payment' => $payment->load(['donor.user', 'donationCycle']),
        ], 201);
    }

    /* ══════════════════════════════════════════
     | 2. SANDBOX — Initiate Flutterwave checkout
     ══════════════════════════════════════════ */

    public function initiate(Request $request)
    {
        $user = $request->user();

        // Clinicians, admins, AND recipients can initiate payments
        if (!in_array($user->role, ['admin', 'clinician', 'recipient'])) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $validated = $request->validate([
            'cycle_id'      => 'required|exists:donation_cycles,id',
            'amount'        => 'required|numeric|min:1000',
            'payment_stage' => 'required|in:initial,final,service_fee,recipient_initial,recipient_final,donor_initial,donor_final',
            'notes'         => 'nullable|string|max:500',
        ]);

        if ($validated['payment_stage'] === 'service_fee' && (float)$validated['amount'] !== 500000.0) {
            return response()->json(['message' => 'The service fee must be exactly 500,000 UGX.'], 422);
        }

        $cycle = DonationCycle::with(['donor.user', 'recipient.user'])->findOrFail($validated['cycle_id']);

        if ($user->role === 'recipient') {
            $recipientProfile = \App\Models\RecipientProfile::where('user_id', $user->id)->first();
            if (!$recipientProfile || $cycle->recipient_id !== $recipientProfile->id) {
                return response()->json(['message' => 'Access denied.'], 403);
            }
            if (!in_array($validated['payment_stage'], ['service_fee', 'recipient_initial', 'recipient_final'])) {
                return response()->json(['message' => 'Recipients can only initiate recipient payments.'], 403);
            }
        }

        // Prevent duplicate payments for same stage
        $existingForStage = Payment::where('cycle_id', $cycle->id)
            ->where('payment_stage', $validated['payment_stage'])
            ->where('payment_status', 'completed')
            ->first();

        if ($existingForStage) {
            return response()->json([
                'message' => "A {$validated['payment_stage']} payment already exists for this cycle and is completed.",
            ], 409);
        }

        // Determine payer: recipient pays recipient stages, clinic pays donor compensation
        $isRecipientPayment = in_array($validated['payment_stage'], ['service_fee', 'recipient_initial', 'recipient_final']);
        $payer = $isRecipientPayment ? $cycle->recipient->user : $cycle->donor->user;
        $description = $isRecipientPayment
            ? 'Egg Donation Payment (' . ucfirst($validated['payment_stage']) . ') — Cycle #' . $cycle->id
            : 'Donor Compensation (' . ucfirst($validated['payment_stage']) . ') — Cycle #' . $cycle->id;

        $ref = Payment::generateReference();

        // Create processing record before calling Flutterwave
        $payment = Payment::create([
            'donor_id'        => $cycle->donor_id,
            'cycle_id'        => $cycle->id,
            'amount'          => $validated['amount'],
            'payment_method'  => 'mobile_money',
            'payment_stage'   => $validated['payment_stage'],
            'payment_status'  => 'processing',
            'reference_number' => $ref,
            'notes'           => $validated['notes'] ?? null,
        ]);

        $flwSecret = config('services.flutterwave.secret_key');
        if (empty($flwSecret) || str_starts_with($flwSecret, 'FLWSECK-') || env('APP_ENV') === 'local' || env('FLW_SIMULATION', true)) {
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            $checkoutUrl = "{$frontendUrl}/momo-validation?tx_ref={$ref}&amount={$validated['amount']}&payment_id={$payment->id}";

            AuditLog::create([
                'user_id'       => $user->id,
                'action'        => 'payment.initiated.simulated',
                'resource_type' => 'Payment',
                'resource_id'   => $payment->id,
                'new_values'    => ['reference' => $ref, 'stage' => $validated['payment_stage'], 'amount' => $validated['amount'], 'simulation' => true],
                'ip_address'    => $request->ip(),
                'user_agent'    => $request->userAgent(),
            ]);

            return response()->json([
                'message'       => 'Compensation initiated — redirecting to Flutterwave checkout',
                'checkout_url'  => $checkoutUrl,
                'reference'     => $ref,
                'payment'       => $payment,
            ]);
        }

        try {
            $result = $this->flw->initiatePayment([
                'tx_ref'       => $ref,
                'amount'       => $validated['amount'],
                'currency'     => 'UGX',
                'email'        => $payer->email,
                'name'         => $payer->first_name . ' ' . $payer->last_name,
                'phone'        => $payer->phone ?? '',
                'description'  => $description,
                'redirect_url' => url('/api/payments/callback'),
                'meta' => [
                    'payment_id'    => $payment->id,
                    'cycle_id'      => $cycle->id,
                    'payment_stage' => $validated['payment_stage'],
                ],
            ]);

            AuditLog::create([
                'user_id'       => $user->id,
                'action'        => 'payment.initiated',
                'resource_type' => 'Payment',
                'resource_id'   => $payment->id,
                'new_values'    => ['reference' => $ref, 'stage' => $validated['payment_stage'], 'amount' => $validated['amount']],
                'ip_address'    => $request->ip(),
                'user_agent'    => $request->userAgent(),
            ]);

            return response()->json([
                'message'       => 'Compensation initiated — redirecting to Flutterwave checkout',
                'checkout_url'  => $result['data']['link'],
                'reference'     => $ref,
                'payment'       => $payment,
            ]);

        } catch (\Throwable $e) {
            // Roll back the pending record if initiation fails
            $payment->update(['payment_status' => 'failed']);
            Log::error('Flutterwave initiate error', ['error' => $e->getMessage()]);

            return response()->json([
                'message' => 'Payment gateway error: ' . $e->getMessage(),
            ], 502);
        }
    }

    /* ══════════════════════════════════════════
     | 3. SANDBOX — Flutterwave callback/webhook
     ══════════════════════════════════════════ */

    public function callback(Request $request)
    {
        $txRef  = $request->query('tx_ref');
        $status = $request->query('status');
        $txId   = $request->query('transaction_id');

        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

        if (!$txRef) {
            return redirect("{$frontendUrl}/clinician/cycles?payment=error&reason=missing_ref");
        }

        $payment = Payment::where('reference_number', $txRef)->first();

        if (!$payment) {
            Log::warning('FLW callback: payment not found', ['tx_ref' => $txRef]);
            return redirect("{$frontendUrl}/clinician/cycles?payment=error&reason=not_found");
        }

        $isRecipientPayment = in_array($payment->payment_stage, ['service_fee', 'recipient_initial', 'recipient_final']);
        $redirectBase = $isRecipientPayment ? 'recipient/dashboard' : 'clinician/cycles';

        if ($status === 'successful' && $txId) {
            try {
                $data = $this->flw->verifyTransaction($txId);

                // Verify amount matches (prevent tampering)
                $expectedAmount = (float) $payment->amount;
                $paidAmount     = (float) ($data['amount'] ?? 0);
                $currency       = $data['currency'] ?? '';

                if ($paidAmount >= $expectedAmount && $currency === 'UGX' && $data['status'] === 'successful') {
                    $newStatus = $payment->payment_stage === 'service_fee' ? 'processing' : 'completed';

                    $paymentData = [
                        'payment_status'     => $newStatus,
                        'flw_transaction_id' => (string) $txId,
                    ];

                    if ($newStatus === 'completed') {
                        $paymentData['payment_date'] = now()->toDateString();
                    }

                    $payment->update($paymentData);

                    AuditLog::create([
                        'user_id'       => $payment->donor->user->id ?? null,
                        'action'        => $isRecipientPayment ? 'payment.received_processing' : 'payment.completed',
                        'resource_type' => 'Payment',
                        'resource_id'   => $payment->id,
                        'old_values'    => ['payment_status' => 'processing'],
                        'new_values'    => ['payment_status' => $newStatus, 'flw_transaction_id' => $txId],
                        'ip_address'    => $request->ip(),
                        'user_agent'    => $request->userAgent(),
                    ]);

                    return redirect("{$frontendUrl}/{$redirectBase}?payment=success&ref={$txRef}");
                } else {
                    $payment->update(['payment_status' => 'failed']);
                    return redirect("{$frontendUrl}/{$redirectBase}?payment=failed&reason=amount_mismatch");
                }

            } catch (\Throwable $e) {
                Log::error('FLW verify error in callback', ['error' => $e->getMessage()]);
                $payment->update(['payment_status' => 'failed']);
                return redirect("{$frontendUrl}/{$redirectBase}?payment=error&reason=verify_failed");
            }
        }

        // Cancelled or failed by user
        $payment->update(['payment_status' => 'failed']);
        return redirect("{$frontendUrl}/{$redirectBase}?payment={$status}&ref={$txRef}");
    }

    /* ══════════════════════════════════════════
     | 4. Update payment status (admin)
     ══════════════════════════════════════════ */

    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'clinician'])) {
            return response()->json(['message' => 'Only admins and clinicians can update payment status.'], 403);
        }

        $validated = $request->validate([
            'payment_status' => 'required|in:pending,processing,completed,failed',
            'payment_date'   => 'nullable|date',
            'notes'          => 'nullable|string|max:500',
        ]);

        $payment = Payment::findOrFail($id);
        $old     = $payment->payment_status;

        $updateData = ['payment_status' => $validated['payment_status']];
        if ($validated['payment_status'] === 'completed') {
            $updateData['payment_date'] = $validated['payment_date'] ?? now()->toDateString();
        }
        if ($validated['notes'] ?? null) {
            $updateData['notes'] = $validated['notes'];
        }

        $payment->update($updateData);

        AuditLog::create([
            'user_id'       => $user->id,
            'action'        => 'payment.status.updated',
            'resource_type' => 'Payment',
            'resource_id'   => $payment->id,
            'old_values'    => ['payment_status' => $old],
            'new_values'    => ['payment_status' => $validated['payment_status']],
            'ip_address'    => $request->ip(),
            'user_agent'    => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Payment status updated',
            'payment' => $payment->fresh()->load(['donor.user', 'donationCycle']),
        ]);
    }

    /* ══════════════════════════════════════════
     | 5. List payments (admin/clinician)
     ══════════════════════════════════════════ */

    public function index(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'clinician'])) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $payments = Payment::with(['donor.user', 'donationCycle'])
            ->when($request->status, fn($q) => $q->where('payment_status', $request->status))
            ->when($request->stage,  fn($q) => $q->where('payment_stage',  $request->stage))
            ->orderByDesc('created_at')
            ->paginate(20);

        if ($user->role === 'admin') {
            $payments->getCollection()->transform(function ($payment) {
                if ($payment->donor) {
                    if ($payment->donor->user) {
                        $payment->donor->user->makeHidden(['phone', 'date_of_birth', 'avatar']);
                    }
                    $payment->donor->makeHidden(['photo_path', 'date_of_birth']);
                }
                return $payment;
            });
        }

        return response()->json($payments);
    }
}
