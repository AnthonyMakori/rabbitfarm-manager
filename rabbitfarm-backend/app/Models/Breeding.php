<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Models\Kindling;

class Breeding extends Model
{
    use HasFactory;

    protected $fillable = [
        'male_rabbit_id',
        'female_rabbit_id',
        'mating_date',
        'expected_kindling_date',
        'actual_kindling_date',
        'pregnancy_status',
        'status',
        'notes',
    ];

    // Laravel 10-compatible attribute casting.
    protected $casts = [
        'mating_date' => 'date',
        'expected_kindling_date' => 'date',
        'actual_kindling_date' => 'date',
    ];

    // The male rabbit associated with this breeding record.
    public function maleRabbit(): BelongsTo
    {
        return $this->belongsTo(Rabbit::class, 'male_rabbit_id');
    }

    // The female rabbit associated with this breeding record.
    public function femaleRabbit(): BelongsTo
    {
        return $this->belongsTo(Rabbit::class, 'female_rabbit_id');
    }

    public function kindling(): HasOne
    {
        return $this->hasOne(Kindling::class);
    }

}
