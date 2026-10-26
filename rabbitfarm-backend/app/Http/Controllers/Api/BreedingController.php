<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Breeding;
use App\Models\Rabbit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BreedingController extends Controller
{
    /**
     * List breeding records with optional filters.
     *
     * GET /api/breedings
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => [
                'nullable',
                Rule::in([
                    'planned',
                    'mated',
                    'pregnant',
                    'kindled',
                    'unsuccessful',
                    'cancelled',
                ]),
            ],
            'pregnancy_status' => [
                'nullable',
                Rule::in([
                    'unknown',
                    'suspected',
                    'confirmed',
                    'not_pregnant',
                ]),
            ],
            'male_rabbit_id' => ['nullable', 'integer', 'exists:rabbits,id'],
            'female_rabbit_id' => ['nullable', 'integer', 'exists:rabbits,id'],
        ]);

        $breedings = Breeding::query()
            ->with(['maleRabbit', 'femaleRabbit'])
            ->when(
                $validated['status'] ?? null,
                fn ($query, $status) => $query->where('status', $status)
            )
            ->when(
                $validated['pregnancy_status'] ?? null,
                fn ($query, $status) => $query->where('pregnancy_status', $status)
            )
            ->when(
                $validated['male_rabbit_id'] ?? null,
                fn ($query, $id) => $query->where('male_rabbit_id', $id)
            )
            ->when(
                $validated['female_rabbit_id'] ?? null,
                fn ($query, $id) => $query->where('female_rabbit_id', $id)
            )
            ->orderByDesc('mating_date')
            ->paginate(15);

        return response()->json($breedings);
    }

    /**
     * Create a breeding record.
     *
     * POST /api/breedings
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'male_rabbit_id' => [
            'required',
            'integer',
            Rule::exists('rabbits', 'id')->where('sex', 'male'),
        ],

        'female_rabbit_id' => [
            'required',
            'integer',
            'different:male_rabbit_id',
            Rule::exists('rabbits', 'id')->where('sex', 'female'),
        ],
            'mating_date' => ['required', 'date'],
            'expected_kindling_date' => ['nullable', 'date', 'after_or_equal:mating_date'],
            'actual_kindling_date' => ['nullable', 'date', 'after_or_equal:mating_date'],
            'pregnancy_status' => [
                'sometimes',
                Rule::in([
                    'unknown',
                    'suspected',
                    'confirmed',
                    'not_pregnant',
                ]),
            ],
            'status' => [
                'sometimes',
                Rule::in([
                    'planned',
                    'mated',
                    'pregnant',
                    'kindled',
                    'unsuccessful',
                    'cancelled',
                ]),
            ],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        // Estimate kindling 31 days after mating if no date was supplied.
        $validated['expected_kindling_date'] ??=
            \Carbon\Carbon::parse($validated['mating_date'])
                ->addDays(31)
                ->toDateString();

        $breeding = Breeding::create($validated);

        $breeding->load(['maleRabbit', 'femaleRabbit']);

        return response()->json([
            'message' => 'Breeding record created successfully.',
            'data' => $breeding,
        ], 201);
    }

    /**
     * Show one breeding record.
     *
     * GET /api/breedings/{breeding}
     */
    public function show(Breeding $breeding): JsonResponse
    {
        $breeding->load(['maleRabbit', 'femaleRabbit']);

        return response()->json([
            'data' => $breeding,
        ]);
    }

    /**
     * Update a breeding record.
     *
     * PUT /api/breedings/{breeding}
     */
    public function update(
        Request $request,
        Breeding $breeding
    ): JsonResponse {
        $validated = $request->validate([
            'male_rabbit_id' => [
            'sometimes',
            'required',
            'integer',
            Rule::exists('rabbits', 'id')->where('sex', 'male'),
        ],

        'female_rabbit_id' => [
            'sometimes',
            'required',
            'integer',
            Rule::exists('rabbits', 'id')->where('sex', 'female'),
        ],
            'mating_date' => ['sometimes', 'required', 'date'],
            'expected_kindling_date' => [
                'nullable',
                'date',
                'after_or_equal:mating_date',
            ],
            'actual_kindling_date' => [
                'nullable',
                'date',
                'after_or_equal:mating_date',
            ],
            'pregnancy_status' => [
                'sometimes',
                Rule::in([
                    'unknown',
                    'suspected',
                    'confirmed',
                    'not_pregnant',
                ]),
            ],
            'status' => [
                'sometimes',
                Rule::in([
                    'planned',
                    'mated',
                    'pregnant',
                    'kindled',
                    'unsuccessful',
                    'cancelled',
                ]),
            ],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        // Validate against the effective IDs, including existing values.
        $maleId = $validated['male_rabbit_id'] ?? $breeding->male_rabbit_id;
        $femaleId = $validated['female_rabbit_id'] ?? $breeding->female_rabbit_id;

        if ((int) $maleId === (int) $femaleId) {
            return response()->json([
                'message' => 'A rabbit cannot be paired with itself.',
                'errors' => [
                    'female_rabbit_id' => [
                        'The male and female rabbits must be different.',
                    ],
                ],
            ], 422);
        }

        // If the mating date changes, ensure any supplied dates remain valid.
        $matingDate = $validated['mating_date'] ?? $breeding->mating_date->toDateString();

        foreach (['expected_kindling_date', 'actual_kindling_date'] as $dateField) {
            $dateValue = $validated[$dateField] ?? $breeding->{$dateField}?->toDateString();

            if ($dateValue !== null && $dateValue < $matingDate) {
                return response()->json([
                    'message' => 'Kindling dates cannot be before the mating date.',
                    'errors' => [
                        $dateField => [
                            'The date must be on or after the mating date.',
                        ],
                    ],
                ], 422);
            }
        }

        $breeding->update($validated);
        $breeding->load(['maleRabbit', 'femaleRabbit']);

        return response()->json([
            'message' => 'Breeding record updated successfully.',
            'data' => $breeding,
        ]);
    }

    /**
     * Delete a breeding record.
     *
     * DELETE /api/breedings/{breeding}
     */
    public function destroy(Breeding $breeding): JsonResponse
    {
        $breeding->delete();

        return response()->json([
            'message' => 'Breeding record deleted successfully.',
        ]);
    }
}