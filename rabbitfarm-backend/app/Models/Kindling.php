<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Kindling extends Model
{
    use HasFactory;

    protected $fillable = [
        'breeding_id',
        'kindling_date',
        'total_born',
        'born_alive',
        'stillborn',
        'current_alive',
        'weaned_count',
        'weaning_date',
        'notes',
    ];

    protected $casts = [
        'kindling_date' => 'date',
        'weaning_date' => 'date',
        'total_born' => 'integer',
        'born_alive' => 'integer',
        'stillborn' => 'integer',
        'current_alive' => 'integer',
        'weaned_count' => 'integer',
    ];

    /**
     * The breeding record that produced this litter.
     */
    public function breeding(): BelongsTo
    {
        return $this->belongsTo(Breeding::class);
    }
}
