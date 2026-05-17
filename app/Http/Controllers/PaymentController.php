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
    public function getDonorPayments(Request $request)
    {
        $user = $request->user();
        $donor = \App\Models\DonorProfile::where('user_id', $user->id)->first();

        if (!$donor) {
            return response()->json(['message' => 'Donor profile not found.'], 404);
        }

        $payments = Payment::where('donor_id', $donor->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'milestone_name' => $p->payment_status === 'completed' ? 'Compensation Received' : 'Pending Milestone',
                    'amount' => $p->amount,
                    'date' => $p->payment_date ? $p->payment_date->format('Y-m-d') : 'TBD',
                    'status' => $p->payment_status, // 'paid', 'pending', 'processing'
                ];
            });

        return response()->json($payments);
    }


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

        \App\Models\Notification::create([
            'user_id' => $cycle->donor->user_id,
            'type' => 'payment',
            'title' => 'New Payment Scheduled',
            'message' => 'A payment of UGX ' . number_format($validated['amount']) . ' has been initiated for your cycle.',
            'is_read' => false,
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
