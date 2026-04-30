<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Matches: " . App\Models\MatchResult::count() . "\n";
echo "Approved Donors: " . App\Models\DonorProfile::where('status','approved')->count() . "\n";
echo "Approved Recipients: " . App\Models\RecipientProfile::where('status','approved')->count() . "\n";
echo "Consents: " . App\Models\Consent::where('consent_type','egg_donation')->where('status','granted')->count() . "\n";
echo "Weights: " . App\Models\MatchingCriteriaWeight::count() . "\n";

echo "\n--- All Donors ---\n";
foreach(App\Models\DonorProfile::all() as $d) {
    echo "  D#{$d->id} status={$d->status} blood={$d->blood_type} avail={$d->availability_status}\n";
}

echo "\n--- All Recipients ---\n";
foreach(App\Models\RecipientProfile::all() as $r) {
    echo "  R#{$r->id} status={$r->status} pref_blood={$r->preferred_blood_type}\n";
}

echo "\n--- Hard Filter Test ---\n";
$donor = App\Models\DonorProfile::where('status','approved')->first();
$recipient = App\Models\RecipientProfile::first();
if ($donor && $recipient) {
    $h = new App\Services\Matching\HardFilterService();
    $res = $h->apply($donor, $recipient);
    echo "D#{$donor->id} vs R#{$recipient->id}: " . ($res['passed'] ? "PASSED" : "FAILED") . "\n";
    if (!$res['passed']) {
        foreach($res['reasons'] as $reason) echo "  - $reason\n";
    }
} else {
    echo "  No approved donor or recipient to test.\n";
}
