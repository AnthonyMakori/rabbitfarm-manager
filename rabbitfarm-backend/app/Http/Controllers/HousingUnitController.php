<?php

namespace App\Http\Controllers;

use App\Models\HousingUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class HousingUnitController extends Controller
{
    /**
     * List housing units with search, filters, and occupancy counts.
     *
     * GET /api/housing-units
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'unit_type' => ['nullable', 'string', 'max:50'],
            'status' => [
                'nullable',
                Rule::in(['active', 'maintenance', 'inactive']),
            ],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = HousingUnit::query()
            ->withCount('rabbits')
            ->with([
                'rabbits:id,rabbit_code,name,housing_unit_id',
            ]);

        if (!empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($subQuery) use ($search) {
                $subQuery
                    ->where('unit_code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['unit_type'])) {
            $query->where('unit_type', $validated['unit_type']);
        }

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $units = $query
            ->orderBy('unit_code')
            ->paginate($validated['per_page'] ?? 10)
            ->withQueryString();

        return response()->json($units);
    }

    /**
     * Create a housing unit.
     *
     * POST /api/housing-units
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'unit_code' => [
                'required',
                'string',
                'max:50',
                'unique:housing_units,unit_code',
            ],
            'name' => ['nullable', 'string', 'max:120'],
            'unit_type' => [
                'required',
                Rule::in(['hutch', 'cage', 'pen', 'colony']),
            ],
            'location' => ['nullable', 'string', 'max:150'],
            'capacity' => ['required', 'integer', 'min:1', 'max:65535'],
            'length_cm' => ['nullable', 'numeric', 'gt:0'],
            'width_cm' => ['nullable', 'numeric', 'gt:0'],
            'height_cm' => ['nullable', 'numeric', 'gt:0'],
            'status' => [
                'sometimes',
                Rule::in(['active', 'maintenance', 'inactive']),
            ],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $unit = HousingUnit::create($validated);

        $unit->loadCount('rabbits');

        return response()->json([
            'message' => 'Housing unit created successfully.',
            'data' => $unit,
        ], 201);
    }

    /**
     * Show one housing unit and its current occupants.
     *
     * GET /api/housing-units/{housingUnit}
     */
    public function show(HousingUnit $housingUnit): JsonResponse
    {
        $housingUnit->load([
            'rabbits',
        ])->loadCount('rabbits');

        return response()->json([
            'data' => $housingUnit,
        ]);
    }

    /**
     * Update a housing unit.
     *
     * GET/PUT /api/housing-units/{housingUnit}
     */
    public function update(
        Request $request,
        HousingUnit $housingUnit
    ): JsonResponse {
        $validated = $request->validate([
            'unit_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('housing_units', 'unit_code')
                    ->ignore($housingUnit->id),
            ],
            'name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'unit_type' => [
                'sometimes',
                'required',
                Rule::in(['hutch', 'cage', 'pen', 'colony']),
            ],
            'location' => ['sometimes', 'nullable', 'string', 'max:150'],
            'capacity' => ['sometimes', 'required', 'integer', 'min:1', 'max:65535'],
            'length_cm' => ['sometimes', 'nullable', 'numeric', 'gt:0'],
            'width_cm' => ['sometimes', 'nullable', 'numeric', 'gt:0'],
            'height_cm' => ['sometimes', 'nullable', 'numeric', 'gt:0'],
            'status' => [
                'sometimes',
                'required',
                Rule::in(['active', 'maintenance', 'inactive']),
            ],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        // Never lower capacity below the current number of occupants.
        if (isset($validated['capacity'])) {
            $currentOccupancy = $housingUnit->rabbits()->count();

            if ($validated['capacity'] < $currentOccupancy) {
                return response()->json([
                    'message' => 'Capacity cannot be lower than the current number of rabbits.',
                    'current_occupancy' => $currentOccupancy,
                ], 422);
            }
        }

        $housingUnit->update($validated);

        $housingUnit->loadCount('rabbits');

        return response()->json([
            'message' => 'Housing unit updated successfully.',
            'data' => $housingUnit,
        ]);
    }

    /**
     * Delete an empty housing unit.
     *
     * DELETE /api/housing-units/{housingUnit}
     */
    public function destroy(HousingUnit $housingUnit): JsonResponse
    {
        if ($housingUnit->rabbits()->exists()) {
            return response()->json([
                'message' => 'This housing unit cannot be deleted while rabbits are assigned to it. Move or unassign the rabbits first.',
            ], 409);
        }

        $housingUnit->delete();

        return response()->json([
            'message' => 'Housing unit deleted successfully.',
        ]);
    }
}
