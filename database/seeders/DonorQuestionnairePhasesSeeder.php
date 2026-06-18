<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\DonorQuestionnairePhase;

class DonorQuestionnairePhasesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $phases = [
            [
                'phase_key' => 'biodata',
                'phase_name' => 'Biodata Information',
                'description' => 'Basic personal and demographic information',
                'order' => 1,
                'is_required' => true,
                'validation_rules' => [
                    'date_of_birth' => 'required|date|before:-18 years',
                    'ethnicity' => 'required|string|max:100',
                    'education_level' => 'required|string|max:100',
                    'occupation' => 'nullable|string|max:100',
                ],
            ],
            [
                'phase_key' => 'fertility_history',
                'phase_name' => 'Fertility & Reproductive History',
                'description' => 'Information about reproductive health and previous pregnancies',
                'order' => 2,
                'is_required' => true,
                'validation_rules' => [
                    'previous_pregnancies' => 'nullable|integer|min:0|max:10',
                    'live_births' => 'nullable|integer|min:0|max:10',
                    'miscarriages' => 'nullable|integer|min:0|max:5',
                    'last_menstrual_period' => 'nullable|date|before:today',
                    'menstrual_cycle_regular' => 'nullable|boolean',
                    'contraceptive_use' => 'nullable|string|max:200',
                ],
            ],
            [
                'phase_key' => 'medical_info',
                'phase_name' => 'Medical Information',
                'description' => 'Comprehensive medical history and current health status',
                'order' => 3,
                'is_required' => true,
                'validation_rules' => [
                    'blood_type' => 'required|string|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
                    'genotype' => 'nullable|string|in:AA,AS,AC,SS,SC,CC',
                    'height_cm' => 'required|numeric|min:100|max:250',
                    'weight_kg' => 'required|numeric|min:30|max:200',
                    'medical_history' => 'nullable|array',
                    'family_medical_history' => 'nullable|array',
                    'current_medications' => 'nullable|string|max:500',
                    'allergies' => 'nullable|string|max:500',
                    'surgeries' => 'nullable|string|max:500',
                ],
            ],
            [
                'phase_key' => 'physical_characteristics',
                'phase_name' => 'Physical Characteristics',
                'description' => 'Physical appearance and characteristics',
                'order' => 4,
                'is_required' => true,
                'validation_rules' => [
                    'skin_tone' => 'required|string|max:50',
                    'hair_color' => 'required|string|max:50',
                    'hair_texture' => 'required|string|max:50',
                    'eye_color' => 'required|string|max:50',
                    'body_type' => 'nullable|string|max:50',
                    'distinctive_features' => 'nullable|string|max:200',
                ],
            ],
            [
                'phase_key' => 'lifestyle_social',
                'phase_name' => 'Lifestyle & Social Information',
                'description' => 'Lifestyle habits, social background, and personal preferences',
                'order' => 5,
                'is_required' => true,
                'validation_rules' => [
                    'smoking_status' => 'nullable|string|in:never,former,current',
                    'alcohol_consumption' => 'nullable|string|in:none,occasional,moderate,heavy',
                    'exercise_frequency' => 'nullable|string|in:none,rare,weekly,regular,daily',
                    'diet_type' => 'nullable|string|max:100',
                    'religion' => 'nullable|string|max:100',
                    'marital_status' => 'nullable|string|in:single,married,divorced,widowed',
                    'children_count' => 'nullable|integer|min:0|max:10',
                    'motivation_for_donating' => 'nullable|string|max:500',
                    'support_system' => 'nullable|string|max:500',
                ],
            ],
        ];

        foreach ($phases as $phase) {
            DonorQuestionnairePhase::create($phase);
        }
    }
}
