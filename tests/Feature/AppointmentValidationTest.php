<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\DonorProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AppointmentValidationTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function donor_cannot_book_appointment_with_invalid_data()
    {
        $user = User::factory()->create([
            'role' => 'donor',
        ]);

        $profile = DonorProfile::factory()->create([
            'user_id' => $user->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson(
            "/api/donors/{$profile->id}/appointments",
            [
                'appointment_type' => '',
                'preferred_date' => '2020-01-01', // past date (invalid)
                'preferred_time_slot' => 'night', // invalid option
            ]
        );

        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'appointment_type',
            'preferred_date',
            'preferred_time_slot',
        ]);
    }

    /** @test */
    public function donor_can_book_appointment_with_valid_data()
    {
        $user = User::factory()->create([
            'role' => 'donor',
        ]);

        $profile = DonorProfile::factory()->create([
            'user_id' => $user->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson(
            "/api/donors/{$profile->id}/appointments",
            [
                'appointment_type' => 'initial_screening',
                'preferred_date' => now()->addDays(3)->toDateString(),
                'preferred_time_slot' => 'morning',
                'donor_notes' => 'Test appointment',
            ]
        );

        $response->assertStatus(201);
        $response->assertJsonFragment([
            'message' => 'Appointment requested successfully.',
        ]);

        $this->assertDatabaseHas('appointments', [
            'donor_profile_id' => $profile->id,
            'appointment_type' => 'initial_screening',
            'preferred_time_slot' => 'morning',
        ]);
    }

    /** @test */
    public function donor_cannot_access_other_donor_profile()
    {
        $user = User::factory()->create([
            'role' => 'donor',
        ]);

        $otherProfile = DonorProfile::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson(
            "/api/donors/{$otherProfile->id}/appointments",
            [
                'appointment_type' => 'initial_screening',
                'preferred_date' => now()->addDays(2)->toDateString(),
                'preferred_time_slot' => 'morning',
            ]
        );

        $response->assertStatus(403);
    }
}