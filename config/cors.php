<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure CORS settings for your Laravel application.
    | This configuration is used by the CORS middleware to determine
    | what cross-origin requests should be allowed.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',     // ← Vite dev server
        'http://127.0.0.1:5173',     // ← Alternative localhost
        'http://localhost:3000',     // ← If using different port
        'http://127.0.0.1:8000',     // ← Backend (for testing)
    ],

    'allowed_origins_patterns' => [
        '#^http://localhost:\d+$#',  // ← Any localhost port
        '#^http://127\.0\.0\.1:\d+$#', // ← Any 127.0.0.1 port
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];