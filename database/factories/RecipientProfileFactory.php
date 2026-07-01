<?php

namespace Database\Factories;

use App\Models\RecipientProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class RecipientProfileFactory extends Factory
{
    protected $model = RecipientProfile::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state(['role' => 'recipient']),
            'recipient_code' => function () {
                return RecipientProfile::generateCode();
            },
            'status' => 'active',
            'diagnosis' => fake()->sentence(),
            'treatment_history' => fake()->paragraph(),
            'preferred_blood_type' => fake()->randomElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
            'preferred_genotype' => fake()->randomElement(['AA', 'AS', 'AC']),
            'preferred_ethnicity' => fake()->randomElement(['African', 'Caucasian', 'Asian', 'Hispanic']),
            'preferred_skin_tone' => fake()->randomElement(['Fair', 'Medium', 'Dark', 'Olive']),
            'preferred_hair_color' => fake()->randomElement(['Black', 'Brown', 'Blonde', 'Red']),
            'preferred_eye_color' => fake()->randomElement(['Black', 'Brown', 'Blue', 'Green']),
            'preferred_age_min' => 18,
            'preferred_age_max' => 35,
            'preferred_education_level' => fake()->randomElement(['Diploma', 'Bachelor', 'Master']),
            'max_previous_donations' => 3,
            'priority_level' => fake()->randomElement(['normal', 'urgent']),
            'clinician_id' => null, // Can be set in state if needed
            'is_international' => false,
        ];
    }
}
