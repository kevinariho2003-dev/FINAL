<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$donors = App\Models\DonorProfile::where('status', 'approved')->get();
foreach ($donors as $donor) {
    $exists = App\Models\Consent::where('user_id', $donor->user_id)
        ->where('consent_type', 'egg_donation')
        ->exists();
        
    if (!$exists) {
        App\Models\Consent::create([
            'user_id' => $donor->user_id,
            'consent_type' => 'egg_donation',
            'status' => 'granted',
            'version' => '1.0',
            'consent_text' => 'I consent to egg donation.',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'System Seed',
            'granted_at' => now(),
        ]);
        echo "Created consent for donor user_id: {$donor->user_id}\n";
    } else {
        echo "Consent already exists for donor user_id: {$donor->user_id}\n";
    }
}
echo "Done.\n";
