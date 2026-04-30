<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\MatchingCriteriaWeight;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Admin user ──
        User::create([
            'first_name' => 'Admin',
            'last_name' => 'EDRMS',
            'email' => 'admin@edrms.ug',
            'role' => 'admin',
            'password' => 'password123',
            'is_active' => true,
        ]);

        // ── Clinician user ──
        User::create([
            'first_name' => 'Dr. Sarah',
            'last_name' => 'Nakamya',
            'email' => 'clinician@edrms.ug',
            'role' => 'clinician',
            'password' => 'password123',
            'is_active' => true,
        ]);

        // ── Sample donor user ──
        User::create([
            'first_name' => 'Grace',
            'last_name' => 'Auma',
            'email' => 'donor@edrms.ug',
            'role' => 'donor',
            'password' => 'password123',
            'is_active' => true,
        ]);

        // ── Sample recipient user ──
        User::create([
            'first_name' => 'Janet',
            'last_name' => 'Mukasa',
            'email' => 'recipient@edrms.ug',
            'role' => 'recipient',
            'password' => 'password123',
            'is_active' => true,
        ]);

        // ── Default matching criteria weights ──
        $criteria = [
            ['criterion_name' => 'blood_type',    'weight' => 1.00, 'is_hard_filter' => true],
            ['criterion_name' => 'genotype',      'weight' => 1.00, 'is_hard_filter' => true],
            ['criterion_name' => 'ethnicity',     'weight' => 0.80, 'is_hard_filter' => false],
            ['criterion_name' => 'skin_tone',     'weight' => 0.60, 'is_hard_filter' => false],
            ['criterion_name' => 'hair_color',    'weight' => 0.50, 'is_hard_filter' => false],
            ['criterion_name' => 'eye_color',     'weight' => 0.50, 'is_hard_filter' => false],
            ['criterion_name' => 'age',           'weight' => 0.70, 'is_hard_filter' => false],
            ['criterion_name' => 'education',     'weight' => 0.40, 'is_hard_filter' => false],
            ['criterion_name' => 'bmi',           'weight' => 0.30, 'is_hard_filter' => false],
            ['criterion_name' => 'prev_donations','weight' => 0.30, 'is_hard_filter' => false],
        ];

        foreach ($criteria as $c) {
            MatchingCriteriaWeight::create($c);
        }
    }
}
