<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Breeding;
use App\Models\Kindling;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use App\Models\Rabbit;
use Illuminate\Support\Facades\DB;

class KindlingController extends Controller
{
    /**
     * List kindling records.
     *
     * GET /api/kindlings
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'breeding_id' => ['sometimes', 'integer', 'exists:breedings,id'],
        ]);

        $kindlings = Kindling::query()
            ->with(['breeding.maleRabbit', 'breeding.femaleRabbit'])
            ->when(
                $validated['breeding_id'] ?? null,
                fn ($query, $id) => $query->where('breeding_id', $id)
            )
            ->orderByDesc('kindling_date')
            ->paginate(15);

        // Return the Laravel paginator directly, like the breeding index.
        return response()->json($kindlings);
    }

    /**
     * Record a birth.
     *
     * POST /api/kindlings
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'breeding_id' => [
                'required',
                'integer',
                'exists:breedings,id',
                'unique:kindlings,breeding_id',
            ],
            'kindling_date' => ['required', 'date'],
            'total_born' => ['required', 'integer', 'min:1', 'max:65535'],
            'born_alive' => ['required', 'integer', 'min:0', 'max:65535'],
            'stillborn' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'current_alive' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'weaned_count' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'weaning_date' => ['nullable', 'date', 'after_or_equal:kindling_date'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $validated['stillborn'] ??= 0;
        $validated['current_alive'] ??= $validated['born_alive'];
        $validated['weaned_count'] ??= 0;

        $this->validateLitterCounts($validated);

        $breeding = Breeding::findOrFail($validated['breeding_id']);

        // A birth cannot happen before its mating date.
        if (
            $validated['kindling_date']
            < $breeding->mating_date->toDateString()
        ) {
            throw ValidationException::withMessages([
                'kindling_date' => [
                    'The kindling date cannot be before the mating date.',
                ],
            ]);
        }

      
        $kindling = DB::transaction(function () use ($validated, $breeding) {
            $kindling = Kindling::create($validated);

            $breeding->update([
                'actual_kindling_date' => $kindling->kindling_date->toDateString(),
                'status' => 'kindled',
            ]);

            // Create individual rabbit records for the live-born kits.
            $this->syncLitterRabbits($kindling);

            return $kindling;
        });

        $kindling->load(['breeding.maleRabbit', 'breeding.femaleRabbit']);

        return response()->json([
            'message' => 'Kindling record created successfully.',
            'data' => $kindling,
        ], 201);
    }

    /**
     * Show one kindling record.
     *
     * GET /api/kindlings/{kindling}
     */
    public function show(Kindling $kindling): JsonResponse
    {
        $kindling->load(['breeding.maleRabbit', 'breeding.femaleRabbit']);

        return response()->json([
            'data' => $kindling,
        ]);
    }

    /**
     * Update litter statistics or kindling details.
     *
     * PUT /api/kindlings/{kindling}
     */
    public function update(
        Request $request,
        Kindling $kindling
    ): JsonResponse {
        $validated = $request->validate([
            'kindling_date' => ['sometimes', 'required', 'date'],
            'total_born' => ['sometimes', 'required', 'integer', 'min:1', 'max:65535'],
            'born_alive' => ['sometimes', 'required', 'integer', 'min:0', 'max:65535'],
            'stillborn' => ['sometimes', 'required', 'integer', 'min:0', 'max:65535'],
            'current_alive' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:65535'],
            'weaned_count' => ['sometimes', 'required', 'integer', 'min:0', 'max:65535'],
            'weaning_date' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        $effective = [
            'total_born' => $validated['total_born'] ?? $kindling->total_born,
            'born_alive' => $validated['born_alive'] ?? $kindling->born_alive,
            'stillborn' => $validated['stillborn'] ?? $kindling->stillborn,
            'current_alive' => array_key_exists('current_alive', $validated)
                ? $validated['current_alive']
                : $kindling->current_alive,
            'weaned_count' => $validated['weaned_count'] ?? $kindling->weaned_count,
        ];

        $this->validateLitterCounts($effective);

        $kindlingDate = $validated['kindling_date']
            ?? $kindling->kindling_date->toDateString();

        if ($kindlingDate < $kindling->breeding->mating_date->toDateString()) {
            throw ValidationException::withMessages([
                'kindling_date' => [
                    'The kindling date cannot be before the mating date.',
                ],
            ]);
        }

        $weaningDate = array_key_exists('weaning_date', $validated)
            ? $validated['weaning_date']
            : $kindling->weaning_date?->toDateString();

        if ($weaningDate !== null && $weaningDate < $kindlingDate) {
            throw ValidationException::withMessages([
                'weaning_date' => [
                    'The weaning date cannot be before the kindling date.',
                ],
            ]);
        }

       DB::transaction(function () use (
    $kindling,
    $validated,
    $kindlingDate
) {
    $kindling->update($validated);

    // Keep the breeding's actual birth date synchronized if changed.
    if (array_key_exists('kindling_date', $validated)) {
        $kindling->breeding->update([
            'actual_kindling_date' => $kindlingDate,
        ]);
    }

    /*
     * Synchronize an already-linked litter.
     *
     * Historical litter records are deliberately skipped if they
     * have no linked kits. We will reconcile those separately after
     * checking for any kits that were registered manually.
     */
    $hasLinkedKits = Rabbit::query()
        ->where('kindling_id', $kindling->id)
        ->exists();

   if ($hasLinkedKits) {
    $this->syncLitterRabbits($kindling->fresh());

    // Once individual records exist, use them as the source of truth.
    $this->refreshKindlingCounts($kindling->id);
}
});

$kindling->refresh();

        $kindling->load(['breeding.maleRabbit', 'breeding.femaleRabbit']);

        return response()->json([
            'message' => 'Kindling record updated successfully.',
            'data' => $kindling,
        ]);
    }

    /**
     * Delete a kindling record.
     *
     * DELETE /api/kindlings/{kindling}
     */
    public function destroy(Kindling $kindling): JsonResponse
    {
        $kindling->delete();

        return response()->json([
            'message' => 'Kindling record deleted successfully.',
        ]);
    }

    /**
     * Validate relationships between litter counts.
     */
    private function validateLitterCounts(array $counts): void
    {
        if (
            (int) $counts['born_alive'] + (int) $counts['stillborn']
            !== (int) $counts['total_born']
        ) {
            throw ValidationException::withMessages([
                'total_born' => [
                    'Total born must equal born alive plus stillborn.',
                ],
            ]);
        }

        if (
            $counts['current_alive'] !== null
            && (int) $counts['current_alive'] > (int) $counts['born_alive']
        ) {
            throw ValidationException::withMessages([
                'current_alive' => [
                    'Current alive cannot exceed the number born alive.',
                ],
            ]);
        }

        if ((int) $counts['weaned_count'] > (int) ($counts['current_alive'] ?? 0)) {
            throw ValidationException::withMessages([
                'weaned_count' => [
                    'Weaned count cannot exceed the current alive count.',
                ],
            ]);
        }
    }

private function syncLitterRabbits(Kindling $kindling): void
{
    $kindling->loadMissing('breeding.femaleRabbit');

    $bornAlive = (int) $kindling->born_alive;

    // Reuse existing records so repeated synchronization cannot
    // create duplicate rabbits for the same litter and kit number.
    $existingRabbits = Rabbit::query()
        ->where('kindling_id', $kindling->id)
        ->get()
        ->keyBy('litter_kit_number');

    // Never silently delete or reassign existing individual records.
    if ($existingRabbits->count() > $bornAlive) {
        throw ValidationException::withMessages([
            'born_alive' => [
                'The live-born count is lower than the number of '
                . 'individual kits already registered for this litter. '
                . 'Review the litter records before changing this count.',
            ],
        ]);
    }

    $mother = $kindling->breeding?->femaleRabbit;

    // Create only missing individual records.
    for ($kitNumber = 1; $kitNumber <= $bornAlive; $kitNumber++) {
        if ($existingRabbits->has($kitNumber)) {
            continue;
        }

        $rabbit = Rabbit::create([
            'kindling_id' => $kindling->id,
            'litter_kit_number' => $kitNumber,
            'name' => null,
            'breed' => $mother?->breed ?? 'Unknown',
            'sex' => 'unknown',
            'date_of_birth' => $kindling->kindling_date->toDateString(),
            'category' => 'kit',
            'status' => 'active',
            'acquisition_source' => 'born_on_farm',
            'notes' => sprintf(
                'Automatically registered from litter #%d, kit #%d. '
                . 'Update sex and individual details when known.',
                $kindling->id,
                $kitNumber
            ),
        ]);

        // Generate the same rabbit code format used by RabbitController.
        $rabbit->rabbit_code = 'RBT-' . str_pad(
            (string) $rabbit->id,
            4,
            '0',
            STR_PAD_LEFT
        );

        $rabbit->save();

        $existingRabbits->put($kitNumber, $rabbit);
    }

   
}


/**
 * Recalculate litter counts from individual rabbit records.
 *
 * Sold and transferred rabbits are still considered alive for
 * litter survival statistics. They do not count as active rabbits
 * on the farm.
 */
private function refreshKindlingCounts(int $kindlingId): void
{
    $kits = Rabbit::query()
        ->where('kindling_id', $kindlingId);

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
