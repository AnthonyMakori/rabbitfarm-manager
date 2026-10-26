<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseController extends Controller
{
    private const CATEGORIES = [
        'feed',
        'veterinary',
        'medicine',
        'housing',
        'equipment',
        'labor',
        'transport',
        'utilities',
        'breeding',
        'other',
    ];

    private const PAYMENT_METHODS = [
        'cash',
        'mpesa',
        'bank_transfer',
        'cheque',
        'other',
    ];

    /**
     * List expenses with optional filters and pagination.
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'category' => ['nullable', Rule::in(self::CATEGORIES)],
            'date_from' => ['nullable', 'date'],
            'date_to' => [
                'nullable',
                'date',
                'after_or_equal:date_from',
            ],
            'search' => ['nullable', 'string', 'max:150'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Expense::query();

        if (!empty($validated['category'])) {
            $query->where('category', $validated['category']);
        }

        if (!empty($validated['date_from'])) {
            $query->whereDate(
                'expense_date',
                '>=',
                $validated['date_from']
            );
        }

        if (!empty($validated['date_to'])) {
            $query->whereDate(
                'expense_date',
                '<=',
                $validated['date_to']
            );
        }

        if (!empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('paid_to', 'like', "%{$search}%")
                    ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        return response()->json(
            $query->orderByDesc('expense_date')
                ->orderByDesc('id')
                ->paginate($validated['per_page'] ?? 15)
        );
    }

    /**
     * Record a new expense.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category' => [
                'required',
                Rule::in(self::CATEGORIES),
            ],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'gt:0', 'decimal:0,2'],
            'expense_date' => ['required', 'date'],
            'paid_to' => ['nullable', 'string', 'max:150'],
            'payment_method' => [
                'required',
                Rule::in(self::PAYMENT_METHODS),
            ],
            'reference' => ['nullable', 'string', 'max:150'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $expense = Expense::create($validated);

        return response()->json([
            'message' => 'Expense recorded successfully.',
            'data' => $expense,
        ], 201);
    }

    /**
     * Display one expense.
     */
    public function show(Expense $expense)
    {
        return response()->json([
            'data' => $expense,
        ]);
    }

    /**
     * Update an existing expense.
     */
    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'category' => [
                'sometimes',
                'required',
                Rule::in(self::CATEGORIES),
            ],
            'description' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],
            'amount' => [
                'sometimes',
                'required',
                'numeric',
                'gt:0',
                'decimal:0,2',
            ],
            'expense_date' => [
                'sometimes',
                'required',
                'date',
            ],
            'paid_to' => ['sometimes', 'nullable', 'string', 'max:150'],
            'payment_method' => [
                'sometimes',
                'required',
                Rule::in(self::PAYMENT_METHODS),
            ],
            'reference' => ['sometimes', 'nullable', 'string', 'max:150'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        $expense->update($validated);

        return response()->json([
            'message' => 'Expense updated successfully.',
            'data' => $expense->fresh(),
        ]);
    }

    /**
     * Delete an expense.
     */
    public function destroy(Expense $expense)
    {
        $expense->delete();

        return response()->json([
            'message' => 'Expense deleted successfully.',
        ]);
    }
}
