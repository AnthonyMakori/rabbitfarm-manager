<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RabbitEvent extends Model
{
    protected $fillable = [
        'rabbit_id',
        'event_type',
        'title',
        'event_date',
        'description',
        'weight_kg',
        'cost',
        'next_due_date',
    ];

    protected $casts = [
        'event_date' => 'date:Y-m-d',
        'next_due_date' => 'date:Y-m-d',
        'weight_kg' => 'decimal:3',
        'cost' => 'decimal:2',
    ];

    public function rabbit(): BelongsTo
    {
        return $this->belongsTo(Rabbit::class);
    }
}
