<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HousingMovement extends Model
{
    use HasFactory;

    // Fields that can be assigned when recording a movement.
    protected $fillable = [
        'rabbit_id',
        'from_housing_unit_id',
        'to_housing_unit_id',
        'moved_at',
        'reason',
        'notes',
    ];

    // The rabbit associated with this movement.
    public function rabbit(): BelongsTo
    {
        return $this->belongsTo(Rabbit::class);
    }

    // The rabbit's previous housing unit.
    public function fromHousingUnit(): BelongsTo
    {
        return $this->belongsTo(
            HousingUnit::class,
            'from_housing_unit_id'
        );
    }

    // The rabbit's destination housing unit.
    public function toHousingUnit(): BelongsTo
    {
        return $this->belongsTo(
            HousingUnit::class,
            'to_housing_unit_id'
        );
    }
}
