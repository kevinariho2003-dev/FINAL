<?php

namespace App\Services\Matching;

use App\Models\DonorProfile;
use App\Models\RecipientProfile;
use App\Models\Consent;
use Carbon\Carbon;

/**
 * Hard Filter Service — Pass/Fail exclusion checks.
 * Any failure means the donor is excluded from matching.
 */
class HardFilterService
{
    /**
     * Run all hard filters. Returns [passed => bool, reasons => [...]]
     */
    public function apply(DonorProfile $donor, RecipientProfile $recipient): array
    {
        $failures = [];

        // 1. Donor must be approved
        if ($donor->status !== 'approved') {
            $failures[] = 'Donor is not approved (status: ' . $donor->status . ')';
        }

        // 2. Donor must be available
        if ($donor->availability_status !== 'available') {
            $failures[] = 'Donor is not available (status: ' . $donor->availability_status . ')';
        }

        // 3. Blood type compatibility (if recipient has a preference)
        if ($recipient->preferred_blood_type && $donor->blood_type) {
            if (!$this->isBloodTypeCompatible($donor->blood_type, $recipient->preferred_blood_type)) {
                $failures[] = "Blood type incompatible ({$donor->blood_type} vs required {$recipient->preferred_blood_type})";
            }
        }

        // 4. Genotype safety check (prevent AS+AS or SS combinations)
        if ($recipient->preferred_genotype && $donor->genotype) {
            if (!$this->isGenotypeCompatible($donor->genotype, $recipient->preferred_genotype)) {
                $failures[] = "Genotype incompatible ({$donor->genotype} + {$recipient->preferred_genotype} — sickle cell risk)";
            }
        }

        // 5. Donor age within recipient's preferred range
        if ($donor->date_of_birth) {
            $age = Carbon::parse($donor->date_of_birth)->age;
            if ($recipient->preferred_age_min && $age < $recipient->preferred_age_min) {
                $failures[] = "Donor age {$age} below minimum {$recipient->preferred_age_min}";
            }
            if ($recipient->preferred_age_max && $age > $recipient->preferred_age_max) {
                $failures[] = "Donor age {$age} above maximum {$recipient->preferred_age_max}";
            }
        }

        // 6. Max previous donations
        if ($recipient->max_previous_donations !== null) {
            if ($donor->previous_donations > $recipient->max_previous_donations) {
                $failures[] = "Donor has {$donor->previous_donations} donations, max allowed: {$recipient->max_previous_donations}";
            }
        }

        // 7. Genetic screening must not be flagged
        if ($donor->genetic_screening_status === 'flagged') {
            $failures[] = 'Donor genetic screening is flagged';
        }

        // 8. Active consent check
        $hasConsent = Consent::where('user_id', $donor->user_id)
            ->where('consent_type', 'egg_donation')
            ->where('status', 'granted')
            ->exists();
        if (!$hasConsent) {
            $failures[] = 'Donor has not granted egg donation consent';
        }

        return [
            'passed' => empty($failures),
            'reasons' => $failures,
        ];
    }

    /**
     * Blood type compatibility matrix for egg donation.
     * For egg donation, exact match or universal compatibility preferred.
     */
    private function isBloodTypeCompatible(string $donor, string $recipient): bool
    {
        // Remove ALL whitespace including non-breaking spaces and convert to uppercase
        $donor = preg_replace('/\s+/u', '', strtoupper($donor));
        $recipient = preg_replace('/\s+/u', '', strtoupper($recipient));

        // For egg donation, the key concern is the recipient's preference match
        // Exact match is always compatible
        if ($donor === $recipient) return true;

        // If recipient prefers a specific type, donor must match
        // We treat it as a hard filter only for exact match requirements
        return false;
    }

    /**
     * Genotype compatibility check — prevent high sickle-cell risk combinations.
     */
    private function isGenotypeCompatible(string $donorGenotype, string $recipientPreferred): bool
    {
        $riskyPairs = [
            'AS' => ['AS', 'SS', 'SC', 'AC'],
            'SS' => ['AS', 'SS', 'SC', 'AC'],
            'AC' => ['AS', 'SS', 'SC', 'AC'],
            'SC' => ['AS', 'SS', 'SC', 'AC'],
        ];

        // If the donor has a sickle trait genotype and the recipient prefers certain genotypes, check
        if (isset($riskyPairs[$donorGenotype]) && in_array($recipientPreferred, $riskyPairs[$donorGenotype])) {
            return false;
        }

        return true;
    }
}
