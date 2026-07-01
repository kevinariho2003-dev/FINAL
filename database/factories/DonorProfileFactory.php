<?php

namespace Database\Factories;

use App\Models\DonorProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DonorProfileFactory extends Factory
{
    protected $model = DonorProfile::class;

    public function definition(): array
    {
        $height = fake()->randomFloat(1, 150, 190);
        $weight = fake()->randomFloat(1, 50, 90);
        $bmi = round($weight / (($height / 100) ** 2), 1);

        return [
            'user_id' => User::factory()->state(['role' => 'donor']),
            'donor_code' => function () {
                return DonorProfile::generateCode();
            },
            'status' => 'approved',
            'date_of_birth' => fake()->date('Y-m-d', '-22 years'), // typical donor age 18-35
            'blood_type' => fake()->randomElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
            'genotype' => fake()->randomElement(['AA', 'AS', 'AC']),
            'height_cm' => $height,
            'weight_kg' => $weight,
            'bmi' => $bmi,
            'medical_history' => [],
            'family_medical_history' => [],
            'genetic_screening_status' => 'clear',
            'ethnicity' => fake()->randomElement(['African', 'Caucasian', 'Asian', 'Hispanic']),
            'skin_tone' => fake()->randomElement(['Fair', 'Medium', 'Dark', 'Olive']),
            'hair_color' => fake()->randomElement(['Black', 'Brown', 'Blonde', 'Red']),
            'hair_texture' => fake()->randomElement(['Straight', 'Wavy', 'Curly', 'Coily']),
            'eye_color' => fake()->randomElement(['Black', 'Brown', 'Blue', 'Green']),
            'education_level' => fake()->randomElement(['Primary', 'Secondary', 'Certificate', 'Diploma', 'Bachelor', 'Master', 'Doctorate']),
            'occupation' => fake()->jobTitle(),
            'previous_donations' => fake()->numberBetween(0, 3),
            'availability_status' => 'available',
            'is_anonymous' => true,
        ];
    }
}
