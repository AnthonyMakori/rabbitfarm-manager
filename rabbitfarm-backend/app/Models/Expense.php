<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    // Fields that may be assigned through validated application input.
    protected $fillable = [
        'category',
        'description',
        'amount',
        'expense_date',
        'paid_to',
        'payment_method',
        'reference',
        'notes',
    ];

    // Keep monetary amounts precise and dates consistently formatted.
    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date:Y-m-d',
    ];
}
