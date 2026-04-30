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
$res = [];
foreach($donors as $d) {
    $res[] = ['donor_id' => $d->id, 'hard_filter' => $h->apply($d, $recipient)];
}
echo json_encode($res, JSON_PRETTY_PRINT);
