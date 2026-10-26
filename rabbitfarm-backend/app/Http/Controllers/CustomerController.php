<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    /**
     * List customers with optional search and filters.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Customer::query();

        if (!empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($q) use ($search) {
                $q->where('customer_code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (array_key_exists('is_active', $validated)) {
            $query->where('is_active', $validated['is_active']);
        }

        return response()->json(
            $query->orderBy('name')
                ->paginate($validated['per_page'] ?? 15)
        );
    }

    /**
     * Register a new customer.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'customer_type' => [
                'sometimes',
                Rule::in(['individual', 'business']),
            ],
            'address' => ['sometimes', 'nullable', 'string'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $customer = Customer::create([
            ...$validated,
            'customer_code' => $this->generateCustomerCode(),
        ]);

        return response()->json([
            'message' => 'Customer registered successfully.',
            'data' => $customer,
        ], 201);
    }

    /**
     * Show one customer.
     */
    public function show(Customer $customer): JsonResponse
    {
        return response()->json(['data' => $customer]);
    }

    /**
     * Update an existing customer.
     */
    public function update(
        Request $request,
        Customer $customer
    ): JsonResponse {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'customer_type' => [
                'sometimes',
                Rule::in(['individual', 'business']),
            ],
            'address' => ['sometimes', 'nullable', 'string'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $customer->update($validated);

        return response()->json([
            'message' => 'Customer updated successfully.',
            'data' => $customer->fresh(),
        ]);
    }

    /**
     * Generate a readable customer reference.
     */
    private function generateCustomerCode(): string
    {
        do {
            $code = 'CUS-' . strtoupper(
                bin2hex(random_bytes(4))
            );
        } while (
            Customer::where('customer_code', $code)->exists()
        );

        return $code;
    }

    /**
     * Deactivate a customer instead of deleting their history.
     */
    public function destroy(Customer $customer): JsonResponse
    {
        $customer->update(['is_active' => false]);

        return response()->json([
            'message' => 'Customer deactivated successfully.',
        ]);
    }
}
