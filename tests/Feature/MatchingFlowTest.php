<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\DonorProfile;
use App\Models\RecipientProfile;
use App\Models\Consent;
use App\Models\MatchingCriteriaWeight;
use App\Models\MatchResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\DatabaseSeeder;

class MatchingFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Seed the matching weights
        $this->seed(DatabaseSeeder::class);
    }

    /** @test */
    public function clinician_can_generate_matches_and_complete_review_flow()
    {
        // 1. Create a Clinician
        $clinician = User::where('role', 'clinician')->first() ?? User::factory()->create(['role' => 'clinician']);

        // 2. Create a Recipient
        $recipientUser = User::factory()->create(['role' => 'recipient']);
        $recipientProfile = RecipientProfile::factory()->create([
            'user_id' => $recipientUser->id,
            'preferred_blood_type' => 'O+',
            'preferred_genotype' => 'AA',
            'preferred_ethnicity' => 'African',
            'preferred_age_min' => 20,
            'preferred_age_max' => 30,
        ]);

        // 3. Create Donors
        // Donor 1: Perfect Match (Should pass hard filters)
        $donorUser1 = User::factory()->create(['role' => 'donor']);
        $donorProfile1 = DonorProfile::factory()->create([
            'user_id' => $donorUser1->id,
            'blood_type' => 'O+',
            'genotype' => 'AA',
            'ethnicity' => 'African',
            'date_of_birth' => now()->subYears(25), // Age 25
            'status' => 'approved',
            'availability_status' => 'available',
        ]);
        // Grant Consent for Donor 1
        Consent::create([
            'user_id' => $donorUser1->id,
            'consent_type' => 'egg_donation',
            'status' => 'granted',
            'consent_text' => 'I consent to egg donation.',
            'granted_at' => now(),
        ]);

        // Donor 2: Incompatible Genotype (Should fail hard filters)
        $donorUser2 = User::factory()->create(['role' => 'donor']);
        $donorProfile2 = DonorProfile::factory()->create([
            'user_id' => $donorUser2->id,
            'blood_type' => 'O+',
            'genotype' => 'SS', // SS + AA = AS (not allowed based on strict genotype check if preferred is AA, wait the HardFilter logic allows SS if recipient is AA? Let's check risky pairs: AS=>[AS,SS,SC,AC], SS=>[AS,SS,SC,AC] etc. If donor is SS and recipient prefers AA, it might pass, but let's fail it on Blood Type instead to be sure).
            'status' => 'approved',
            'availability_status' => 'available',
        ]);
        // Change Donor 2 to fail Blood Type check (Recipient wants O+, donor has AB+)
        $donorProfile2->update(['blood_type' => 'AB+']);
        Consent::create([
            'user_id' => $donorUser2->id,
            'consent_type' => 'egg_donation',
            'status' => 'granted',
            'consent_text' => 'I consent.',
            'granted_at' => now(),
        ]);

        // Donor 3: No Consent (Should fail hard filters)
        $donorUser3 = User::factory()->create(['role' => 'donor']);
        $donorProfile3 = DonorProfile::factory()->create([
            'user_id' => $donorUser3->id,
            'status' => 'approved',
            'availability_status' => 'available',
        ]);

        // 4. Generate Matches as Clinician
        $response = $this->actingAs($clinician, 'sanctum')
            ->postJson("/api/matches/generate/{$recipientProfile->id}");

        $response->assertStatus(200);
        $response->assertJsonFragment(['message' => 'Matching complete']);
        
        // Assert only 1 donor passed hard filters (Donor 1)
        $this->assertEquals(1, $response->json('summary.passed_hard_filter'));
        $this->assertEquals($donorProfile1->id, $response->json('matches.0.donor_id'));

        $matchId = $response->json('matches.0.id');

        // 5. Clinician Reviews and Approves the Match
        $reviewResponse = $this->actingAs($clinician, 'sanctum')
            ->patchJson("/api/matches/{$matchId}/review", [
                'status' => 'approved',
                'review_notes' => 'Looks good.'
            ]);

        $reviewResponse->assertStatus(200);
        $this->assertDatabaseHas('matches', [
            'id' => $matchId,
            'status' => 'approved',
        ]);

        // 6. Recipient Accepts the Match
        $recipientReviewResponse = $this->actingAs($recipientUser, 'sanctum')
            ->patchJson("/api/matches/{$matchId}/recipient-review", [
                'recipient_status' => 'accepted'
            ]);

        $recipientReviewResponse->assertStatus(200);
        $this->assertDatabaseHas('matches', [
            'id' => $matchId,
            'recipient_status' => 'accepted',
        ]);
    }
}
