<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Rabbit extends Model
{
    use HasFactory;

    protected $fillable = [
        'rabbit_code',
        'name',
        'breed',
        'sex',
        'date_of_birth',
        'weight_kg',
        'category',
        'status',
        'acquisition_source',
        'acquisition_cost',
        'acquired_at',
        'exit_date',
        'notes',
        'image_path', // NEW: stores the photo's relative path
    ];

    // Automatically include the image URL in API responses.
    protected $appends = ['image_url'];

    protected $casts = [
        'date_of_birth' => 'date',
        'acquired_at' => 'date',
        'exit_date' => 'date',
        'weight_kg' => 'decimal:3',
        'acquisition_cost' => 'decimal:2',
    ];

    /**
     * Return a browser-accessible URL for the rabbit's photo.
     */
    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) {
            return null;
        }

        return Storage::disk('public')->url($this->image_path);
    }

    public function events(): HasMany
    {
        return $this->hasMany(RabbitEvent::class);
    }

    /**
 * Breeding records where this rabbit is the male.
 */
public function maleBreedings(): HasMany
{
    return $this->hasMany(Breeding::class, 'male_rabbit_id');
}

public function femaleBreedings(): HasMany
{
    return $this->hasMany(Breeding::class, 'female_rabbit_id');
}

public function housingUnit(): BelongsTo
{
    return $this->belongsTo(HousingUnit::class, 'housing_unit_id');
}

public function housingMovements(): HasMany
{
    return $this->hasMany(HousingMovement::class);
}
}