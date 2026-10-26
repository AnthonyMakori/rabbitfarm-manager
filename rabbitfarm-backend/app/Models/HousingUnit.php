<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HousingUnit extends Model
{
    use HasFactory;

    // Fields that can be assigned when creating or updating a housing unit.
    protected $fillable = [
        'unit_code',
        'name',
        'unit_type',
        'location',
        'capacity',
        'length_cm',
        'width_cm',
        'height_cm',
        'status',
        'notes',
    ];

    // A housing unit can accommodate multiple rabbits.
    public function rabbits(): HasMany
    {
        return $this->hasMany(Rabbit::class, 'housing_unit_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(
            HousingMovement::class,
            'from_housing_unit_id'
        )->orWhere('to_housing_unit_id', $this->getKey());
    }

    // Movements in which a rabbit left this housing unit.
    public function outgoingMovements(): HasMany
    {
        return $this->hasMany(
            HousingMovement::class,
            'from_housing_unit_id'
        );
    }

    // Movements in which a rabbit entered this housing unit.
    public function incomingMovements(): HasMany
    {
        return $this->hasMany(
            HousingMovement::class,
            'to_housing_unit_id'
        );
    }
}
