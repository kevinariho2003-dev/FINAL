<?php

namespace App\Http\Controllers;

use App\Models\DonorProfile;
use App\Models\ScreeningDocument;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ScreeningController extends Controller
{
    /**
     * List screening documents for a donor.
     */
    public function index(Request $request, $donorId)
    {
        $user = $request->user();
        $profile = DonorProfile::findOrFail($donorId);

        // Donors can only see their own documents
        if ($user->role === 'donor' && $profile->user_id !== $user->id) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $documents = $profile->screeningDocuments()
            ->with('reviewer:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($documents);
    }

    /**
     * Upload a screening document.
     */
    public function store(Request $request, $donorId)
    {
        $user = $request->user();
        $profile = DonorProfile::where('id', $donorId)->where('user_id', $user->id)->first();

        if (!$profile) {
            return response()->json(['message' => 'Donor profile not found or access denied.'], 403);
        }

        $validated = $request->validate([
            'document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'document_type' => 'required|in:medical_report,genetic_screening,blood_test,other',
            'notes' => 'nullable|string|max:500',
        ]);

        $file = $request->file('document');
        $path = $file->store('screening_documents/' . $profile->id, 'public');

        $document = ScreeningDocument::create([
            'donor_profile_id' => $profile->id,
            'document_type' => $validated['document_type'],
            'file_path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending_review',
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'screening.document.uploaded',
            'resource_type' => 'ScreeningDocument',
            'resource_id' => $document->id,
            'new_values' => $document->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Document uploaded successfully',
            'document' => $document,
        ], 201);
    }

    /**
     * Clinician reviews (verifies/rejects) a screening document.
     */
    public function review(Request $request, $id)
    {
        $user = $request->user();

        if ($user->role !== 'clinician') {
            return response()->json(['message' => 'Access denied. Only clinicians can review screening documents.'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:verified,rejected',
            'review_notes' => 'nullable|string|max:500',
        ]);

        $document = ScreeningDocument::findOrFail($id);
        $old = $document->status;

        $document->update([
            'status' => $validated['status'],
            'review_notes' => $validated['review_notes'] ?? null,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'screening.document.reviewed',
            'resource_type' => 'ScreeningDocument',
            'resource_id' => $document->id,
            'old_values' => ['status' => $old],
            'new_values' => ['status' => $validated['status']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Document ' . $validated['status'] . ' successfully',
            'document' => $document->fresh()->load('reviewer:id,first_name,last_name'),
        ]);
    }

    /**
     * Donor deletes own pending document.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $document = ScreeningDocument::findOrFail($id);
        $profile = DonorProfile::findOrFail($document->donor_profile_id);

        if ($user->role === 'donor' && $profile->user_id !== $user->id) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        if ($document->status !== 'pending_review' && $user->role === 'donor') {
            return response()->json(['message' => 'Cannot delete a reviewed document.'], 422);
        }

        // Delete the file from storage
        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return response()->json(['message' => 'Document deleted successfully']);
    }
}
