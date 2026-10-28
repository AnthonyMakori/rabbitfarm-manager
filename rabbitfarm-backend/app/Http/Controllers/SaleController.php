<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Rabbit;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\Kindling; // Added: update litter counts after selling rabbits.
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SaleController extends Controller
{
    /**
     * List sales with customer details and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'customer_id' => ['sometimes', 'nullable', 'integer'],
            'payment_status' => [
                'sometimes',
                'nullable',
                'in:unpaid,partial,paid',
            ],
            'date_from' => ['sometimes', 'nullable', 'date'],
            'date_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:date_from'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Sale::query()
            ->with([
                'customer:id,name,customer_code',
                'items.rabbit:id,rabbit_code,name,breed,sex,status',
                'payments',
            ])
            ->latest('sale_date')
            ->latest('id');

        if (!empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($q) use ($search) {
                $q->where('sale_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('customer_code', 'like', "%{$search}%");
                    });
            });
        }

        if (!empty($validated['customer_id'])) {
            $query->where('customer_id', $validated['customer_id']);
        }

        if (!empty($validated['payment_status'])) {
            $query->where('payment_status', $validated['payment_status']);
        }

        if (!empty($validated['date_from'])) {
            $query->whereDate('sale_date', '>=', $validated['date_from']);
        }

        if (!empty($validated['date_to'])) {
            $query->whereDate('sale_date', '<=', $validated['date_to']);
        }

        return response()->json(
            $query->paginate($validated['per_page'] ?? 15)
        );
    }

    /**
     * Record a sale, mark the selected rabbits as sold,
     * and refresh the counts for any linked kindlings.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'sale_date' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.rabbit_id' => [
                'required',
                'integer',
                'distinct',
                'exists:rabbits,id',
            ],
            'items.*.unit_price' => [
                'required',
                'numeric',
                'gt:0',
                'decimal:0,2',
            ],
        ]);

        $saleDate = $validated['sale_date']
            ?? now()->toDateString();

        $sale = DB::transaction(function () use ($validated, $saleDate) {
            // Lock the customer record while checking whether they are active.
            $customer = Customer::query()
                ->whereKey($validated['customer_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if (!$customer->is_active) {
                abort(422, 'This customer is inactive and cannot make a sale.');
            }

            $rabbitIds = collect($validated['items'])
                ->pluck('rabbit_id')
                ->map(fn ($id) => (int) $id)
                ->sort()
                ->values();

            // Lock rabbits in a consistent order to reduce race conditions.
            $rabbits = Rabbit::query()
                ->whereIn('id', $rabbitIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($rabbits->count() !== $rabbitIds->count()) {
                abort(422, 'One or more selected rabbits could not be found.');
            }

            foreach ($rabbitIds as $rabbitId) {
                if ($rabbits[$rabbitId]->status !== 'active') {
                    abort(
                        422,
                        "Rabbit {$rabbits[$rabbitId]->rabbit_code} is not active and cannot be sold."
                    );
                }
            }

            // Calculate totals on the server; never trust a frontend total.
            $totalCents = collect($validated['items'])->sum(
                fn ($item) => (int) round((float) $item['unit_price'] * 100)
            );

            $saleNumber = $this->generateSaleNumber();

            $sale = Sale::create([
                'sale_number' => $saleNumber,
                'customer_id' => $customer->id,
                'sale_date' => $saleDate,
                'total_amount' => number_format($totalCents / 100, 2, '.', ''),
                'amount_paid' => '0.00',
                'payment_status' => 'unpaid',
                'status' => 'completed',
                'notes' => $validated['notes'] ?? null,
            ]);

            // Track affected litters so each one is recalculated only once.
            $affectedKindlingIds = [];

            foreach ($validated['items'] as $item) {
                $rabbit = $rabbits[(int) $item['rabbit_id']];
                $unitPrice = (int) round((float) $item['unit_price'] * 100);

                $sale->items()->create([
                    'rabbit_id' => $rabbit->id,
                    'unit_price' => number_format($unitPrice / 100, 2, '.', ''),
                    'line_total' => number_format($unitPrice / 100, 2, '.', ''),
                ]);

                // Mark the rabbit as sold.
                $rabbit->update([
                    'status' => 'sold',
                    'exit_date' => $saleDate,
                ]);

                // Remember the litter if this rabbit came from a recorded kindling.
                if ($rabbit->kindling_id !== null) {
                    $affectedKindlingIds[] = (int) $rabbit->kindling_id;
                }
            }

            // Refresh aggregate counts for affected litters.
            // Sold rabbits remain alive, but are no longer active farm residents.
            foreach (array_unique($affectedKindlingIds) as $kindlingId) {
                $livingStatuses = ['active', 'sold', 'transferred'];

                $currentAlive = DB::table('rabbits')
                    ->where('kindling_id', $kindlingId)
                    ->whereIn('status', $livingStatuses)
                    ->count();

                $weanedCount = DB::table('rabbits')
                    ->where('kindling_id', $kindlingId)
                    ->whereIn('status', $livingStatuses)
                    ->where('category', 'growing')
                    ->count();

                Kindling::query()
                    ->whereKey($kindlingId)
                    ->update([
                        'current_alive' => $currentAlive,
                        'weaned_count' => $weanedCount,
                    ]);
            }

            return $sale;
        });

        return response()->json([
            'message' => 'Sale recorded successfully.',
            'data' => $sale->load([
                'customer:id,name,customer_code',
                'items.rabbit',
                'payments',
            ]),
        ], 201);
    }

    /**
     * Show one sale with its rabbits and payment history.
     */
    public function show(Sale $sale): JsonResponse
    {
        return response()->json([
            'data' => $sale->load([
                'customer',
                'items.rabbit',
                'payments',
            ]),
        ]);
    }

    /**
     * Record a payment against an existing sale.
     */
    public function storePayment(Request $request, Sale $sale): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'decimal:0,2'],
            'payment_method' => [
                'required',
                'in:cash,mpesa,bank_transfer,cheque,other',
            ],
            'reference' => ['sometimes', 'nullable', 'string', 'max:100'],
            'paid_at' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        $payment = DB::transaction(function () use ($sale, $validated) {
            // Re-read and lock the sale to prevent concurrent overpayments.
            $lockedSale = Sale::query()
                ->whereKey($sale->id)
                ->lockForUpdate()
                ->firstOrFail();

            $amountCents = (int) round((float) $validated['amount'] * 100);
            $totalCents = (int) round((float) $lockedSale->total_amount * 100);
            $paidCents = (int) round(
                (float) $lockedSale->payments()->sum('amount') * 100
            );

            $remainingCents = $totalCents - $paidCents;

            if ($remainingCents <= 0) {
                abort(422, 'This sale has already been paid in full.');
            }

            if ($amountCents > $remainingCents) {
                abort(
                    422,
                    'Payment exceeds the outstanding balance of '
                    . number_format($remainingCents / 100, 2)
                    . '.'
                );
            }

            $payment = $lockedSale->payments()->create([
                'amount' => number_format($amountCents / 100, 2, '.', ''),
                'payment_method' => $validated['payment_method'],
                'reference' => $validated['reference'] ?? null,
                'paid_at' => !empty($validated['paid_at'])
                    ? \Illuminate\Support\Carbon::parse($validated['paid_at'])
                        ->format('Y-m-d H:i:s')
                    : now(),
                'notes' => $validated['notes'] ?? null,
            ]);

            $newPaidCents = $paidCents + $amountCents;

            $lockedSale->update([
                'amount_paid' => number_format($newPaidCents / 100, 2, '.', ''),
                'payment_status' => $newPaidCents >= $totalCents
                    ? 'paid'
                    : 'partial',
            ]);

            return $payment;
        });

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'data' => $payment->load('sale'),
        ], 201);
    }

    /**
     * Generate a unique sale number.
     */
    private function generateSaleNumber(): string
    {
        do {
            $number = 'SALE-' . now()->format('Ymd')
                . '-' . strtoupper(Str::random(6));
        } while (Sale::where('sale_number', $number)->exists());

        return $number;
    }
}
