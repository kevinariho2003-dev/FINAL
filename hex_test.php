<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$donors = App\Models\DonorProfile::where('status', 'approved')->get();
$recipient = App\Models\RecipientProfile::first();

foreach($donors as $d) {
    echo "Donor: " . $d->blood_type . " => " . bin2hex($d->blood_type) . "\n";
    echo "Recip: " . $recipient->preferred_blood_type . " => " . bin2hex($recipient->preferred_blood_type) . "\n";
}
