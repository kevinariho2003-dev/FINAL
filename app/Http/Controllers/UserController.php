<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\AuditLog;

class UserController extends Controller
{
    /**
     * Upload an avatar for the authenticated user.
     */
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', // Max 5MB
        ]);

        $user = $request->user();

        if ($request->hasFile('avatar')) {
            // Delete old avatar if it exists
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }

            // Store new avatar
            $path = $request->file('avatar')->store('avatars', 'public');

            $oldAvatar = $user->avatar;
            $user->update(['avatar' => $path]);

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'user.avatar.uploaded',
                'resource_type' => 'User',
                'resource_id' => $user->id,
                'old_values' => ['avatar' => $oldAvatar],
                'new_values' => ['avatar' => $path],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // Append full URL for frontend usage
            $user->avatar_url = asset('storage/' . $path);

            return response()->json([
                'message' => 'Profile picture updated successfully',
                'avatar_path' => $path,
                'avatar_url' => $user->avatar_url,
                'user' => $user
            ]);
        }

        return response()->json(['message' => 'No image file provided'], 400);
    }
}
