<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FarmSetting extends Model
{
    protected $fillable = [
        'farm_name',
        'phone',
        'email',
        'address',
        'city',
        'country',
        'logo_path',
        'currency',
        'timezone',
        'date_format',
    ];
}