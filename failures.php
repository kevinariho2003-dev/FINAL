<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$donors = App\Models\DonorProfile::where('status', 'approved')->get();
$recipient = App\Models\RecipientProfile::first();
if (!$recipient) {
    echo "No recipient found\n";
    exit;
}

$h = new App\Services\Matching\HardFilterService();
foreach($donors as $d) {
    $res = $h->apply($d, $recipient);
    if (!$res['passed']) {
        echo implode("\n", $res['reasons']) . "\n";
    }
}
