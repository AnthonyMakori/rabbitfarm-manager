<?php

namespace App\Http\Controllers;

use App\Models\HousingMovement;
use App\Models\HousingUnit;
use App\Models\Rabbit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class HousingMovementController extends Controller
{
    /**
     * Display housing movement history.
     *
     * GET /api/housing-movements
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rabbit_id' => ['nullable', 'integer', 'exists:rabbits,id'],
            'housing_unit_id' => [
                'nullable',
                'integer',
                'exists:housing_units,id',
            ],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = HousingMovement::query()
            ->with([
                'rabbit',
                'fromHousingUnit',
                'toHousingUnit',
            ])
            ->latest('moved_at');

        if (isset($validated['rabbit_id'])) {
            $query->where('rabbit_id', $validated['rabbit_id']);
        }

        if (isset($validated['housing_unit_id'])) {
            $unitId = $validated['housing_unit_id'];

            $query->where(function ($movementQuery) use ($unitId) {
                $movementQuery
                    ->where('from_housing_unit_id', $unitId)
                    ->orWhere('to_housing_unit_id', $unitId);
            });
        }

        return response()->json(
            $query->paginate($validated['per_page'] ?? 10)
        );
    }

    /**
     * Assign a rabbit to a housing unit or transfer it.
     *
     * POST /api/housing-movements
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rabbit_id' => [
                'required',
                'integer',
                'exists:rabbits,id',
            ],
            'to_housing_unit_id' => [
                'required',
                'integer',
                'exists:housing_units,id',
            ],
            'reason' => [
                'nullable',
                Rule::in([
                    'initial_assignment',
                    'transfer',
                    'health',
                    'cleaning',
                    'weaning',
                    'other',
                ]),
            ],
            'notes' => ['nullable', 'string', 'max:5000'],
            'moved_at' => ['nullable', 'date'],
        ]);

        $movement = DB::transaction(function () use ($validated) {
            // Lock the rabbit to prevent simultaneous assignments.
            $rabbit = Rabbit::query()
                ->lockForUpdate()
                ->findOrFail($validated['rabbit_id']);

            // Lock the destination unit while checking its capacity and status.
            $destination = HousingUnit::query()
                ->lockForUpdate()
                ->findOrFail($validated['to_housing_unit_id']);

            if ($destination->status !== 'active') {
                abort(422, 'Rabbits can only be assigned to active housing units.');
            }

            $currentUnitId = $rabbit->housing_unit_id;
            $destinationUnitId = $destination->id;

            if ($currentUnitId === $destinationUnitId) {
                abort(422, 'This rabbit is already assigned to that housing unit.');
            }

            // Count current occupants from the rabbits table.
            $occupancy = $destination->rabbits()->count();

            if ($occupancy >= $destination->capacity) {
                abort(422, 'This housing unit has reached its capacity.');
            }

            // Record the movement before updating the rabbit's current housing.
            $movement = HousingMovement::create([
                'rabbit_id' => $rabbit->id,
                'from_housing_unit_id' => $currentUnitId,
                'to_housing_unit_id' => $destinationUnitId,
                'moved_at' => $validated['moved_at'] ?? now(),
                'reason' => $validated['reason']
                    ?? ($currentUnitId ? 'transfer' : 'initial_assignment'),
                'notes' => $validated['notes'] ?? null,
            ]);

            // The rabbits table remains the source of truth for current housing.
            $rabbit->housing_unit_id = $destinationUnitId;
            $rabbit->save();

            return $movement;
        });

        $movement->load([
            'rabbit',
            'fromHousingUnit',
            'toHousingUnit',
        ]);

        return response()->json([
            'message' => 'Rabbit housing assignment recorded successfully.',
            'data' => $movement,
        ], 201);
    }

    /**
     * Remove a rabbit from its current housing unit.
     *
     * POST /api/rabbits/{rabbit}/unassign-housing
     */
    public function unassign(
        Request $request,
        Rabbit $rabbit
    ): JsonResponse {
        $validated = $request->validate([
            'reason' => [
                'nullable',
                Rule::in([
                    'transfer',
                    'health',
                    'cleaning',
                    'weaning',
                    'other',
                ]),
            ],
            'notes' => ['nullable', 'string', 'max:5000'],
            'moved_at' => ['nullable', 'date'],
        ]);

        $movement = DB::transaction(function () use (
            $rabbit,
            $validated
        ) {
            $lockedRabbit = Rabbit::query()
                ->lockForUpdate()
                ->findOrFail($rabbit->id);

            if (!$lockedRabbit->housing_unit_id) {
                abort(422, 'This rabbit does not currently have a housing assignment.');
            }

            $previousUnitId = $lockedRabbit->housing_unit_id;

            $movement = HousingMovement::create([
                'rabbit_id' => $lockedRabbit->id,
                'from_housing_unit_id' => $previousUnitId,
                'to_housing_unit_id' => null,
                'moved_at' => $validated['moved_at'] ?? now(),
                'reason' => $validated['reason'] ?? 'other',
                'notes' => $validated['notes'] ?? null,
            ]);

            $lockedRabbit->housing_unit_id = null;
            $lockedRabbit->save();

            return $movement;
        });

        $movement->load([
            'rabbit',
            'fromHousingUnit',
            'toHousingUnit',
        ]);

        return response()->json([
            'message' => 'Rabbit unassigned from housing successfully.',
            'data' => $movement,
        ]);
    }
}
