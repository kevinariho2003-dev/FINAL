<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminProfile extends Model
{
    protected $fillable = [
        'user_id',
        'access_level',
        'department',
        'permissions',
        'last_login_at',
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'last_login_at' => 'datetime',
        ];
    }

    // ── Relationships ──

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
