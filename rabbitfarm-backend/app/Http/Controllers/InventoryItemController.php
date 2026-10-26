<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InventoryItemController extends Controller
{
    /**
     * List inventory items with optional search and filters.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'category' => ['sometimes', 'nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
            'low_stock' => ['sometimes', 'in:true,false,1,0'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = InventoryItem::query();

        if (!empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('item_code', 'like', "%{$search}%")
                    ->orWhere('supplier', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['category'])) {
            $query->where('category', $validated['category']);
        }

        if (array_key_exists('is_active', $validated)) {
            $query->where('is_active', $validated['is_active']);
        }

        if (!empty($validated['low_stock'])) {
            $query->whereColumn(
                'quantity_on_hand',
                '<=',
                'reorder_level'
            );
        }

        $items = $query
            ->orderBy('name')
            ->paginate($validated['per_page'] ?? 15);

        return response()->json($items);
    }

    /**
     * Create an inventory item.
     *
     * New items begin with zero stock. Use a stock movement
     * to record opening stock or a new delivery.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_code' => [
                'required',
                'string',
                'max:50',
                'unique:inventory_items,item_code',
            ],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:50'],
            'unit' => ['required', 'string', 'max:20'],
            'reorder_level' => ['sometimes', 'numeric', 'min:0'],
            'unit_cost' => ['sometimes', 'numeric', 'min:0'],
            'supplier' => ['sometimes', 'nullable', 'string', 'max:255'],
            'storage_location' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);

        // Initial stock is zero; stock is added through the movement API.
        $validated['quantity_on_hand'] = 0;

        $item = InventoryItem::create($validated);

        return response()->json([
            'message' => 'Inventory item created successfully.',
            'data' => $item,
        ], 201);
    }

    /**
     * View one item and its recent stock movement history.
     */
    public function show(InventoryItem $inventoryItem): JsonResponse
    {
        $inventoryItem->load([
            'movements' => fn ($query) => $query
                ->orderByDesc('moved_at')
                ->orderByDesc('id')
                ->limit(20),
        ]);

        return response()->json([
            'data' => $inventoryItem,
        ]);
    }

    /**
     * Update item details, not its stock balance.
     */
    public function update(
        Request $request,
        InventoryItem $inventoryItem
    ): JsonResponse {
        $validated = $request->validate([
            'item_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('inventory_items', 'item_code')
                    ->ignore($inventoryItem->id),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'category' => ['sometimes', 'required', 'string', 'max:50'],
            'unit' => ['sometimes', 'required', 'string', 'max:20'],
            'reorder_level' => ['sometimes', 'numeric', 'min:0'],
            'unit_cost' => ['sometimes', 'numeric', 'min:0'],
            'supplier' => ['sometimes', 'nullable', 'string', 'max:255'],
            'storage_location' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);

        $inventoryItem->update($validated);

        return response()->json([
            'message' => 'Inventory item updated successfully.',
            'data' => $inventoryItem->fresh(),
        ]);
    }

    /**
     * Delete an item only if it has no stock and no movement history.
     */
    public function destroy(InventoryItem $inventoryItem): JsonResponse
    {
        if (
            (float) $inventoryItem->quantity_on_hand > 0
            || $inventoryItem->movements()->exists()
        ) {
            return response()->json([
                'message' => 'This item has stock or movement history. '
                    . 'Deactivate it instead of deleting it.',
            ], 422);
        }

        $inventoryItem->delete();

        return response()->json([
            'message' => 'Inventory item deleted successfully.',
        ]);
    }
}
