<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class InventoryMovementController extends Controller
{
    /**
     * List stock movements, optionally filtered by item or type.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'inventory_item_id' => [
                'sometimes',
                'integer',
                'exists:inventory_items,id',
            ],
            'movement_type' => [
                'sometimes',
                Rule::in([
                    'received',
                    'consumed',
                    'damaged',
                    'adjustment_in',
                    'adjustment_out',
                ]),
            ],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = InventoryMovement::with('inventoryItem:id,item_code,name,unit');

        if (isset($validated['inventory_item_id'])) {
            $query->where(
                'inventory_item_id',
                $validated['inventory_item_id']
            );
        }

        if (isset($validated['movement_type'])) {
            $query->where(
                'movement_type',
                $validated['movement_type']
            );
        }

        if (isset($validated['from'])) {
            $query->whereDate('moved_at', '>=', $validated['from']);
        }

        if (isset($validated['to'])) {
            $query->whereDate('moved_at', '<=', $validated['to']);
        }

        return response()->json(
            $query->orderByDesc('moved_at')
                ->orderByDesc('id')
                ->paginate($validated['per_page'] ?? 15)
        );
    }

    /**
     * Record a stock movement and update the balance atomically.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'inventory_item_id' => [
                'required',
                'integer',
                'exists:inventory_items,id',
            ],
            'movement_type' => [
                'required',
                Rule::in([
                    'received',
                    'consumed',
                    'damaged',
                    'adjustment_in',
                    'adjustment_out',
                ]),
            ],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'unit_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'moved_at' => ['sometimes', 'date'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);

        $movement = DB::transaction(function () use ($validated) {
            // Lock the item row so simultaneous movements cannot
            // overwrite each other's stock calculations.
            $item = InventoryItem::query()
                ->lockForUpdate()
                ->findOrFail($validated['inventory_item_id']);

            if (!$item->is_active) {
                abort(422, 'Cannot record movements for an inactive item.');
            }

            $increasesStock = in_array(
                $validated['movement_type'],
                ['received', 'adjustment_in'],
                true
            );

            $quantity = (float) $validated['quantity'];
            $currentStock = (float) $item->quantity_on_hand;

            $newStock = $increasesStock
                ? $currentStock + $quantity
                : $currentStock - $quantity;

            if ($newStock < 0) {
                abort(422, 'Insufficient stock for this movement.');
            }

            $movement = InventoryMovement::create([
                'inventory_item_id' => $item->id,
                'movement_type' => $validated['movement_type'],
                'quantity' => $quantity,
                'unit_cost' => $validated['unit_cost']
                    ?? (
                        $validated['movement_type'] === 'received'
                            ? $item->unit_cost
                            : null
                    ),
                'moved_at' => isset($validated['moved_at'])
                    ? Carbon::parse($validated['moved_at'])->utc()->format('Y-m-d H:i:s')
                    : now(),
                'reference' => $validated['reference'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            $item->quantity_on_hand = $newStock;

            // Update the item's cost when a delivery supplies a new cost.
            if (
                $validated['movement_type'] === 'received'
                && isset($validated['unit_cost'])
            ) {
                $item->unit_cost = $validated['unit_cost'];
            }

            $item->save();

            return $movement;
        });

        return response()->json([
            'message' => 'Stock movement recorded successfully.',
            'data' => $movement->load(
                'inventoryItem:id,item_code,name,unit,quantity_on_hand'
            ),
        ], 201);
    }
}
