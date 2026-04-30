<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$donors = App\Models\DonorProfile::where('status', 'approved')->get();
$recipient = App\Models\RecipientProfile::first();
$h = new App\Services\Matching\HardFilterService();

foreach($donors as $d) {
    $r = $h->apply($d, $recipient);
    echo "Donor {$d->id}: " . ($r['passed'] ? "PASSED" : "FAILED") . "\n";
}
