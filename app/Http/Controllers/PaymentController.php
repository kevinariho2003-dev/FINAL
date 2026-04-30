<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\DonationCycle;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    /**
     * Create a payment for a donation cycle.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'clinician'])) {
            return response()->json(['message' => 'Only clinicians/admins can create payments.'], 403);
        }

        $validated = $request->validate([
            'cycle_id' => 'required|exists:donation_cycles,id',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'sometimes|in:bank_transfer,mobile_money,cash,cheque',
        ]);

        $cycle = DonationCycle::findOrFail($validated['cycle_id']);

        // Check no payment already exists for this cycle
        if ($cycle->payment) {
            return response()->json(['message' => 'A payment already exists for this cycle.'], 409);
        }

        $payment = Payment::create([
            'donor_id' => $cycle->donor_id,
            'cycle_id' => $cycle->id,
            'amount' => $validated['amount'],
            'payment_method' => $validated['payment_method'] ?? 'bank_transfer',
            'payment_status' => 'pending',
            'reference_number' => Payment::generateReference(),
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'payment.created',
            'resource_type' => 'Payment',
            'resource_id' => $payment->id,
            'new_values' => $payment->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Payment created',
            'payment' => $payment->load(['donor.user', 'donationCycle']),
        ], 201);
    }

    /**
     * Update payment status (process, complete, or fail).
     */
    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin'])) {
            return response()->json(['message' => 'Only admins can update payment status.'], 403);
        }

        $validated = $request->validate([
            'payment_status' => 'required|in:pending,processing,completed,failed',
            'payment_date' => 'nullable|date',
        ]);

        $payment = Payment::findOrFail($id);
        $old = $payment->payment_status;

        $updateData = ['payment_status' => $validated['payment_status']];

        // Auto-set payment_date when completed
        if ($validated['payment_status'] === 'completed') {
            $updateData['payment_date'] = $validated['payment_date'] ?? now()->toDateString();
        }

        $payment->update($updateData);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'payment.status.updated',
            'resource_type' => 'Payment',
            'resource_id' => $payment->id,
            'old_values' => ['payment_status' => $old],
            'new_values' => ['payment_status' => $validated['payment_status']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Payment status updated',
            'payment' => $payment->fresh()->load(['donor.user', 'donationCycle']),
        ]);
    }
}
