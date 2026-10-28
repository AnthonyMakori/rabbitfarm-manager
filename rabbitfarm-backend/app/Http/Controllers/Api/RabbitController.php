<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rabbit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use App\Models\Kindling;

class RabbitController extends Controller
{
    /**
     * List rabbits, with optional search and filtering.
     *
     * GET /api/rabbits
     */
    public function index(Request $request): JsonResponse
    {
        $query = Rabbit::query();

        // Search by identification code, name, or breed.
        if ($request->filled('search')) {
            $search = $request->input('search');

            $query->where(function ($builder) use ($search) {
                $builder->where('rabbit_code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('breed', 'like', "%{$search}%");
            });
        }

        // Optional filters.
        if ($request->filled('sex')) {
            $query->where('sex', $request->input('sex'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Keep pagination within reasonable limits.
        $perPage = min(
            max((int) $request->input('per_page', 10), 1),
            100
        );

        $rabbits = $query
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json($rabbits);
    }

    /**
     * Register a new rabbit.
     *
     * POST /api/rabbits
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:100'],
            'breed' => ['required', 'string', 'max:100'],
           'sex' => [
            'required',
            Rule::in(['male', 'female', 'unknown']),
        ],

            'date_of_birth' => [
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'weight_kg' => [
                'nullable',
                'numeric',
                'gt:0',
                'max:99999.999',
            ],

            'category' => [
                'required',
                Rule::in(['breeding', 'growing', 'kit']),
            ],

            'status' => [
                'sometimes',
                Rule::in([
                    'active',
                    'sold',
                    'deceased',
                    'culled',
                    'transferred',
                ]),
            ],

            'acquisition_source' => [
                'required',
                Rule::in([
                    'born_on_farm',
                    'purchased',
                    'transferred',
                ]),
            ],

            'acquisition_cost' => [
                'nullable',
                'numeric',
                'min:0',
                'max:9999999999.99',
            ],

            'acquired_at' => ['nullable', 'date', 'before_or_equal:today'],

            'exit_date' => ['nullable', 'date'],

            'notes' => ['nullable', 'string', 'max:5000'],

            'image' => [
            'nullable',
            'image',
            'mimes:jpg,jpeg,png,webp',
            'max:5120',
        ],
        ]);

        // Remove the uploaded file from the ordinary model attributes.
        unset($validated['image']);

        // Store the photo on Laravel's public disk.
        if ($request->hasFile('image')) {
            $validated['image_path'] = $request
                ->file('image')
                ->store('rabbits', 'public');
        }

        // Generate a stable, human-readable code after obtaining the ID.
        $rabbit = DB::transaction(function () use ($validated) {
            $rabbit = Rabbit::create($validated);

            $rabbit->rabbit_code = 'RBT-' . str_pad(
                (string) $rabbit->id,
                4,
                '0',
                STR_PAD_LEFT
            );

            $rabbit->save();

            return $rabbit->fresh();
        });

        return response()->json([
            'message' => 'Rabbit registered successfully.',
            'data' => $rabbit,
        ], 201);
    }

    /**
     * Display one rabbit.
     *
     * GET /api/rabbits/{rabbit}
     */
    public function show(Rabbit $rabbit): JsonResponse
    {
        return response()->json([
            'data' => $rabbit,
        ]);
    }

    /**
     * Update a rabbit's details.
     *
     * PUT /api/rabbits/{rabbit}
     */
    public function update(Request $request, Rabbit $rabbit): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'breed' => ['sometimes', 'required', 'string', 'max:100'],

            'sex' => [
            'sometimes',
            'required',
            Rule::in(['male', 'female', 'unknown']),
        ],

            'date_of_birth' => [
                'sometimes',
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'weight_kg' => [
                'sometimes',
                'nullable',
                'numeric',
                'gt:0',
                'max:99999.999',
            ],

            'category' => [
                'sometimes',
                'required',
                Rule::in(['breeding', 'growing', 'kit']),
            ],

            'status' => [
                'sometimes',
                'required',
                Rule::in([
                    'active',
                    'sold',
                    'deceased',
                    'culled',
                    'transferred',
                ]),
            ],

            'acquisition_source' => [
                'sometimes',
                'required',
                Rule::in([
                    'born_on_farm',
                    'purchased',
                    'transferred',
                ]),
            ],

            'acquisition_cost' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
                'max:9999999999.99',
            ],

            'acquired_at' => [
                'sometimes',
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'exit_date' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        // Never allow updates to replace the generated identification code.
        unset($validated['rabbit_code']);

        $rabbit->update($validated);

        // If this is a kit linked to a litter, keep the litter totals in sync.
        if ($rabbit->kindling_id !== null) {
            $this->refreshKindlingCounts((int) $rabbit->kindling_id);
        }
        return response()->json([
            'message' => 'Rabbit updated successfully.',
            'data' => $rabbit->fresh(),
        ]);
    }

   

public function destroy(Rabbit $rabbit): JsonResponse
{
    // Save the litter ID before deleting the rabbit record.
    $kindlingId = $rabbit->kindling_id;

    DB::transaction(function () use ($rabbit, $kindlingId) {
        $rabbit->delete();

        // Recalculate counts after deletion, if this rabbit belonged to a litter.
        if ($kindlingId !== null) {
            $this->refreshKindlingCounts((int) $kindlingId);
        }
    });

    return response()->json([
        'message' => 'Rabbit record deleted successfully.',
    ]);
}



private function refreshKindlingCounts(int $kindlingId): void
{
    $kits = Rabbit::query()
        ->where('kindling_id', $kindlingId);

    // Keep this consistent with KindlingController and SaleController.
    $livingStatuses = ['active', 'sold', 'transferred'];

    $currentAlive = (clone $kits)
        ->whereIn('status', $livingStatuses)
        ->count();

    $weanedCount = (clone $kits)
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

}