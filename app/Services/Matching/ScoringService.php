<?php

namespace App\Services\Matching;

use App\Models\DonorProfile;
use App\Models\RecipientProfile;
use App\Models\MatchingCriteriaWeight;
use Carbon\Carbon;

/**
 * MCDA Scoring Service — Multi-Criteria Decision Analysis.
 * Scores each surviving donor (post-hard-filter) on a 0–100 scale.
 */
class ScoringService
{
    private array $weights;

    public function __construct()
    {
        $this->weights = MatchingCriteriaWeight::pluck('weight', 'criterion_name')->toArray();
    }

    /**
     * Calculate the composite MCDA score and per-criterion breakdown.
     */
    public function score(DonorProfile $donor, RecipientProfile $recipient): array
    {
        $criteria = [];
        $totalWeight = 0;
        $weightedSum = 0;

        // 1. Ethnicity match
        $criteria['ethnicity'] = $this->scoreText(
            $donor->ethnicity,
            $recipient->preferred_ethnicity,
            $this->getWeight('ethnicity')
        );

        // 2. Skin tone match
        $criteria['skin_tone'] = $this->scoreExact(
            $donor->skin_tone,
            $recipient->preferred_skin_tone,
            $this->getWeight('skin_tone')
        );

        // 3. Hair color match
        $criteria['hair_color'] = $this->scoreExact(
            $donor->hair_color,
            $recipient->preferred_hair_color,
            $this->getWeight('hair_color')
        );

        // 4. Eye color match
        $criteria['eye_color'] = $this->scoreExact(
            $donor->eye_color,
            $recipient->preferred_eye_color,
            $this->getWeight('eye_color')
        );

        // 5. Age preference match
        $criteria['age'] = $this->scoreAge(
            $donor->date_of_birth,
            $recipient->preferred_age_min,
            $recipient->preferred_age_max,
            $this->getWeight('age')
        );

        // 6. Education match
        $criteria['education'] = $this->scoreEducation(
            $donor->education_level,
            $recipient->preferred_education_level,
            $this->getWeight('education')
        );

        // 7. BMI / health score
        $criteria['bmi'] = $this->scoreBmi(
            $donor->bmi,
            $this->getWeight('bmi')
        );

        // 8. Previous donations freshness
        $criteria['prev_donations'] = $this->scoreDonations(
            $donor->previous_donations,
            $recipient->max_previous_donations,
            $this->getWeight('prev_donations')
        );

        // Calculate weighted composite
        foreach ($criteria as $key => $criterion) {
            if ($criterion['weight'] > 0) {
                $totalWeight += $criterion['weight'];
                $weightedSum += $criterion['raw_score'] * $criterion['weight'];
            }
        }

        $composite = $totalWeight > 0 ? round(($weightedSum / $totalWeight) * 100, 2) : 0;

        return [
            'composite_score' => $composite,
            'breakdown' => $criteria,
        ];
    }

    private function getWeight(string $criterion): float
    {
        return $this->weights[$criterion] ?? 0.5;
    }

    /**
     * Score text match (partial matching for ethnicity).
     */
    private function scoreText(?string $donorVal, ?string $recipientPref, float $weight): array
    {
        if (!$recipientPref) {
            return ['raw_score' => 1.0, 'weight' => $weight, 'match' => 'no_preference', 'details' => 'No preference set'];
        }
        if (!$donorVal) {
            return ['raw_score' => 0.0, 'weight' => $weight, 'match' => 'missing', 'details' => 'Donor value not provided'];
        }

        $donorLower = strtolower(trim($donorVal));
        $prefLower = strtolower(trim($recipientPref));

        if ($donorLower === $prefLower) {
            return ['raw_score' => 1.0, 'weight' => $weight, 'match' => 'exact', 'details' => "Exact match: {$donorVal}"];
        }
        if (str_contains($donorLower, $prefLower) || str_contains($prefLower, $donorLower)) {
            return ['raw_score' => 0.5, 'weight' => $weight, 'match' => 'partial', 'details' => "Partial match: {$donorVal} ≈ {$recipientPref}"];
        }
        return ['raw_score' => 0.0, 'weight' => $weight, 'match' => 'none', 'details' => "{$donorVal} ≠ {$recipientPref}"];
    }

    /**
     * Score exact match or close match.
     */
    private function scoreExact(?string $donorVal, ?string $recipientPref, float $weight): array
    {
        if (!$recipientPref) {
            return ['raw_score' => 1.0, 'weight' => $weight, 'match' => 'no_preference', 'details' => 'No preference set'];
        }
        if (!$donorVal) {
            return ['raw_score' => 0.0, 'weight' => $weight, 'match' => 'missing', 'details' => 'Donor value not provided'];
        }

        if (strtolower($donorVal) === strtolower($recipientPref)) {
            return ['raw_score' => 1.0, 'weight' => $weight, 'match' => 'exact', 'details' => "Exact match: {$donorVal}"];
        }
        return ['raw_score' => 0.0, 'weight' => $weight, 'match' => 'none', 'details' => "{$donorVal} ≠ {$recipientPref}"];
    }

    /**
     * Score donor age fit within preference range.
     */
    private function scoreAge($dob, ?int $minAge, ?int $maxAge, float $weight): array
    {
        if (!$minAge && !$maxAge) {
            return ['raw_score' => 1.0, 'weight' => $weight, 'match' => 'no_preference', 'details' => 'No age preference'];
        }
        if (!$dob) {
            return ['raw_score' => 0.0, 'weight' => $weight, 'match' => 'missing', 'details' => 'Donor DOB not provided'];
        }

        $age = Carbon::parse($dob)->age;
        $min = $minAge ?? 18;
        $max = $maxAge ?? 45;

        if ($age >= $min && $age <= $max) {
            // Perfect fit — score based on how centered in range
            $center = ($min + $max) / 2;
            $range = ($max - $min) / 2;
            $deviation = abs($age - $center);
            $score = $range > 0 ? max(0, 1.0 - ($deviation / $range) * 0.3) : 1.0;
            return ['raw_score' => round($score, 2), 'weight' => $weight, 'match' => 'in_range', 'details' => "Age {$age} within {$min}–{$max}"];
        }

        return ['raw_score' => 0.0, 'weight' => $weight, 'match' => 'out_of_range', 'details' => "Age {$age} outside {$min}–{$max}"];
    }

    /**
     * Score education level match.
     */
    private function scoreEducation(?string $donorEd, ?string $recipientPref, float $weight): array
    {
        if (!$recipientPref) {
            return ['raw_score' => 1.0, 'weight' => $weight, 'match' => 'no_preference', 'details' => 'No preference'];
        }
        if (!$donorEd) {
            return ['raw_score' => 0.0, 'weight' => $weight, 'match' => 'missing', 'details' => 'Donor education not provided'];
        }

        $levels = ['Primary' => 1, 'Secondary' => 2, 'Certificate' => 3, 'Diploma' => 4, 'Bachelor' => 5, 'Master' => 6, 'Doctorate' => 7];
        $donorLevel = $levels[$donorEd] ?? 0;
        $prefLevel = $levels[$recipientPref] ?? 0;

        if ($donorLevel === $prefLevel) {
            return ['raw_score' => 1.0, 'weight' => $weight, 'match' => 'exact', 'details' => "Exact match: {$donorEd}"];
        }
        if ($donorLevel > $prefLevel) {
            return ['raw_score' => 0.8, 'weight' => $weight, 'match' => 'higher', 'details' => "{$donorEd} exceeds {$recipientPref}"];
        }
        return ['raw_score' => 0.3, 'weight' => $weight, 'match' => 'lower', 'details' => "{$donorEd} below {$recipientPref}"];
    }

    /**
     * Score BMI — healthy range (18.5–24.9) gets full score.
     */
    private function scoreBmi(?float $bmi, float $weight): array
    {
        if (!$bmi) {
            return ['raw_score' => 0.5, 'weight' => $weight, 'match' => 'missing', 'details' => 'BMI not calculated'];
        }

        if ($bmi >= 18.5 && $bmi <= 24.9) {
            return ['raw_score' => 1.0, 'weight' => $weight, 'match' => 'healthy', 'details' => "BMI {$bmi} (healthy range)"];
        }
        if ($bmi >= 25 && $bmi <= 29.9) {
            return ['raw_score' => 0.6, 'weight' => $weight, 'match' => 'overweight', 'details' => "BMI {$bmi} (overweight)"];
        }
        return ['raw_score' => 0.3, 'weight' => $weight, 'match' => 'outside_range', 'details' => "BMI {$bmi} (outside healthy range)"];
    }

    /**
     * Score donation history — fewer previous donations = higher freshness.
     */
    private function scoreDonations(int $donations, ?int $maxAllowed, float $weight): array
    {
        if ($maxAllowed === null) {
            // No preference — still score freshness
            $score = max(0, 1.0 - ($donations * 0.15));
            return ['raw_score' => round($score, 2), 'weight' => $weight, 'match' => 'scored', 'details' => "{$donations} previous donation(s)"];
        }

        if ($donations <= $maxAllowed) {
            $score = $maxAllowed > 0 ? 1.0 - ($donations / $maxAllowed) * 0.5 : 1.0;
            return ['raw_score' => round($score, 2), 'weight' => $weight, 'match' => 'within_limit', 'details' => "{$donations}/{$maxAllowed} donations"];
        }

        return ['raw_score' => 0.0, 'weight' => $weight, 'match' => 'exceeded', 'details' => "{$donations} exceeds max {$maxAllowed}"];
    }
}
