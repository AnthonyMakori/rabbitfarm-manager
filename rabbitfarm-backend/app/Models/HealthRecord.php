<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HealthRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'rabbit_id',
        'record_date',
        'category',
        'title',
        'diagnosis',
        'symptoms',
        'treatment',
        'medication',
        'dosage',
        'administered_by',
        'next_due_date',
        'cost',
        'status',
        'notes',
    ];

    protected $casts = [
        'record_date' => 'date',
        'next_due_date' => 'date',
        'cost' => 'decimal:2',
    ];

    /**
     * Each health record belongs to one rabbit.
     */
    public function rabbit(): BelongsTo
    {
        return $this->belongsTo(Rabbit::class);
    }
}