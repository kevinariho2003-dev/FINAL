<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    /*
    |------------------------------------------------------------------
    | 1. REGISTER — validate form, send OTP, do NOT create user yet
    |------------------------------------------------------------------
    */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'first_name'            => 'required|string|max:255',
            'last_name'             => 'required|string|max:255',
            'email'                 => 'required|string|email|max:255',
            'phone'                 => 'nullable|string|max:20',
            'date_of_birth'         => 'nullable|date|before:today',
            'role'                  => 'required|in:donor,recipient',
            'password'              => ['required', 'confirmed', Password::min(8)],
            'password_confirmation' => 'required',
        ]);

        // Prevent forgery: Check if a user with the same first_name and last_name already exists
        $sameName = User::where('first_name', $validated['first_name'])
            ->where('last_name', $validated['last_name'])
            ->first();
        if ($sameName) {
            return response()->json([
                'errors' => ['first_name' => ['This combination of first and last names is already registered.']]
            ], 422);
        }

        // Block already-verified accounts
        $existing = User::where('email', $validated['email'])->first();
        if ($existing && $existing->email_verified_at) {
            return response()->json([
                'errors' => ['email' => ['This email address is already registered.']]
            ], 422);
        }

        // Rate-limit resend: 60-second cooldown
        $recent = DB::table('email_otps')
            ->where('email', $validated['email'])
            ->where('created_at', '>=', now()->subSeconds(60))
            ->first();

        if ($recent) {
            $wait = 60 - now()->diffInSeconds($recent->created_at);
            return response()->json([
                'message' => "Please wait {$wait}s before requesting another code.",
                'wait'    => $wait,
            ], 429);
        }

        $this->issueOtp($validated['email'], $validated);

        return response()->json([
            'pending' => true,
            'message' => 'A 6-digit verification code has been sent to ' . $validated['email'],
        ]);
    }

    /*
    |------------------------------------------------------------------
    | 2. VERIFY OTP — check code, create user, issue token
    |------------------------------------------------------------------
    */
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp'   => 'required|string|size:6',
        ]);

        $record = DB::table('email_otps')
            ->where('email', $request->email)
            ->latest('created_at')
            ->first();

        if (!$record) {
            return response()->json(['message' => 'No verification code found. Please register again.'], 404);
        }

        if (now()->isAfter($record->expires_at)) {
            DB::table('email_otps')->where('email', $request->email)->delete();
            return response()->json(['message' => 'Your code has expired. Please request a new one.'], 422);
        }

        if ($record->attempts >= 3) {
            DB::table('email_otps')->where('email', $request->email)->delete();
            return response()->json(['message' => 'Too many wrong attempts. Please request a new code.'], 422);
        }

        if ($record->otp !== $request->otp) {
            DB::table('email_otps')
                ->where('id', $record->id)
                ->increment('attempts');

            $left = 3 - ($record->attempts + 1);
            return response()->json([
                'message'           => "Incorrect code. {$left} attempt(s) remaining.",
                'attempts_remaining' => $left,
            ], 422);
        }

        // ── OTP is correct — create the user or log in ──
        $formData = json_decode($record->form_data, true);

        if (isset($formData['login']) && $formData['login'] === true) {
            $user = User::where('email', $request->email)->firstOrFail();
            DB::table('email_otps')->where('email', $request->email)->delete();
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'message' => 'Login successful',
                'user'    => $user,
                'token'   => $token,
            ]);
        }

        // Guard: someone might register then re-register before verifying
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            $user = User::create([
                'first_name'        => $formData['first_name'],
                'last_name'         => $formData['last_name'],
                'email'             => $formData['email'],
                'phone'             => $formData['phone'] ?? null,
                'date_of_birth'     => $formData['date_of_birth'] ?? null,
                'role'              => $formData['role'],
                'password'          => $formData['password'],
                'email_verified_at' => now(),
            ]);
        } else {
            $user->update(['email_verified_at' => now()]);
        }

        DB::table('email_otps')->where('email', $request->email)->delete();

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Email verified successfully! Welcome to EDRMS.',
            'user'    => $user,
            'token'   => $token,
        ], 201);
    }

    /*
    |------------------------------------------------------------------
    | 3. RESEND OTP — regenerate code with 60-second cooldown
    |------------------------------------------------------------------
    */
    public function resendOtp(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $record = DB::table('email_otps')
            ->where('email', $request->email)
            ->latest('created_at')
            ->first();

        if (!$record) {
            return response()->json(['message' => 'No pending registration found for this email.'], 404);
        }

        // 60-second cooldown
        if (now()->diffInSeconds($record->created_at, true) < 60) {
            $wait = 60 - now()->diffInSeconds($record->created_at, true);
            return response()->json([
                'message' => "Please wait {$wait}s before requesting another code.",
                'wait'    => (int) $wait,
            ], 429);
        }

        // Regenerate OTP with same form_data
        $this->issueOtp($request->email, json_decode($record->form_data, true));

        return response()->json(['message' => 'A new code has been sent to ' . $request->email]);
    }

    /*
    |------------------------------------------------------------------
    | 4. DEV ONLY — peek at the current OTP (local env only)
    |------------------------------------------------------------------
    */
    public function devOtp(Request $request)
    {
        if (app()->environment('production')) {
            abort(404);
        }

        $request->validate(['email' => 'required|email']);

        $record = DB::table('email_otps')
            ->where('email', $request->email)
            ->latest('created_at')
            ->first();

        if (!$record) {
            return response()->json(['otp' => null, 'message' => 'No OTP found'], 404);
        }

        return response()->json([
            'otp'        => $record->otp,
            'expires_at' => $record->expires_at,
            'attempts'   => $record->attempts,
        ]);
    }

    /*
    |------------------------------------------------------------------
    | 5. LOGIN
    |------------------------------------------------------------------
    */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($validated)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $user = Auth::user();

        if (!$user->is_active) {
            Auth::logout();
            return response()->json(['message' => 'Account is deactivated. Contact administrator.'], 403);
        }

        // Only public registrations (donor/recipient) must verify email.
        // Admin and clinician accounts are created by the system — no OTP needed.
        $requiresVerification = in_array($user->role, ['donor', 'recipient']);
        if ($requiresVerification && !$user->email_verified_at) {
            Auth::logout();
            return response()->json(['message' => 'Please verify your email before logging in.'], 403);
        }

        // Clinicians require OTP on every login
        if ($user->role === 'clinician') {
            Auth::logout();
            $this->issueOtp($user->email, ['login' => true]);
            return response()->json([
                'requires_otp' => true,
                'email'        => $user->email,
                'message'      => 'A verification code has been sent to ' . $user->email,
            ]);
        }

        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user'    => $user,
            'token'   => $token,
        ]);
    }

    /*
    |------------------------------------------------------------------
    | 6. LOGOUT
    |------------------------------------------------------------------
    */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    /*
    |------------------------------------------------------------------
    | 7. GET AUTHENTICATED USER
    |------------------------------------------------------------------
    */
    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    /*
    |------------------------------------------------------------------
    | PRIVATE HELPERS
    |------------------------------------------------------------------
    */

    private function issueOtp(string $email, array $formData): void
    {
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Remove any previous OTP for this email
        DB::table('email_otps')->where('email', $email)->delete();

        DB::table('email_otps')->insert([
            'email'      => $email,
            'otp'        => $otp,
            'form_data'  => json_encode($formData),
            'expires_at' => now()->addMinutes(10),
            'attempts'   => 0,
            'created_at' => now(),
        ]);

        // Send via configured mail driver (log in dev, real in prod)
        try {
            Mail::raw(
                "Your EDRMS verification code is: {$otp}\n\nThis code expires in 10 minutes. Do not share it.",
                function ($message) use ($email, $formData) {
                    $message->to($email)
                        ->subject('Your EDRMS Email Verification Code');
                }
            );
        } catch (\Throwable $e) {
            Log::error('OTP mail failed', ['email' => $email, 'error' => $e->getMessage()]);
        }

        Log::info("OTP issued for {$email}: {$otp}");
    }
}
