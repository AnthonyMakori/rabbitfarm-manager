<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HealthRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class HealthRecordController extends Controller
{
 
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rabbit_id' => [
                'sometimes',
                'integer',
                'exists:rabbits,id',
            ],
            'category' => [
                'sometimes',
                'string',
                Rule::in([
                    'checkup',
                    'illness',
                    'vaccination',
                    'treatment',
                    'injury',
                    'surgery',
                    'parasite_control',
                    'other',
                ]),
            ],
            'status' => [
                'sometimes',
                'string',
                Rule::in([
                    'completed',
                    'ongoing',
                    'follow_up',
                ]),
            ],
            'search' => [
                'sometimes',
                'string',
                'max:150',
            ],
        ]);

        $records = HealthRecord::query()
            ->with('rabbit')
            ->when(
                $validated['rabbit_id'] ?? null,
                fn ($query, $rabbitId) =>
                    $query->where('rabbit_id', $rabbitId)
            )
            ->when(
                $validated['category'] ?? null,
                fn ($query, $category) =>
                    $query->where('category', $category)
            )
            ->when(
                $validated['status'] ?? null,
                fn ($query, $status) =>
                    $query->where('status', $status)
            )
            ->when(
                $validated['search'] ?? null,
                function ($query, $search) {
                    $query->where(function ($subQuery) use ($search) {
                        $subQuery
                            ->where('title', 'like', "%{$search}%")
                            ->orWhere('diagnosis', 'like', "%{$search}%")
                            ->orWhere('symptoms', 'like', "%{$search}%")
                            ->orWhere('medication', 'like', "%{$search}%")
                            ->orWhere('notes', 'like', "%{$search}%");
                    });
                }
            )
            ->orderByDesc('record_date')
            ->orderByDesc('id')
            ->paginate(15);

        return response()->json($records);
    }

    /**
     * Create a health record.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rabbit_id' => [
                'required',
                'integer',
                'exists:rabbits,id',
            ],
            'record_date' => [
                'required',
                'date',
            ],
            'category' => [
                'required',
                'string',
                Rule::in([
                    'checkup',
                    'illness',
                    'vaccination',
                    'treatment',
                    'injury',
                    'surgery',
                    'parasite_control',
                    'other',
                ]),
            ],
            'title' => [
                'required',
                'string',
                'max:150',
            ],
            'diagnosis' => [
                'nullable',
                'string',
                'max:5000',
            ],
            'symptoms' => [
                'nullable',
                'string',
                'max:5000',
            ],
            'treatment' => [
                'nullable',
                'string',
                'max:5000',
            ],
            'medication' => [
                'nullable',
                'string',
                'max:150',
            ],
            'dosage' => [
                'nullable',
                'string',
                'max:100',
            ],
            'administered_by' => [
                'nullable',
                'string',
                'max:150',
            ],
            'next_due_date' => [
                'nullable',
                'date',
                'after_or_equal:record_date',
            ],
            'cost' => [
                'nullable',
                'numeric',
                'min:0',
                'max:99999999.99',
            ],
            'status' => [
                'sometimes',
                'required',
                'string',
                Rule::in([
                    'completed',
                    'ongoing',
                    'follow_up',
                ]),
            ],
            'notes' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ]);

        // Use completed when the client does not supply a status.
        $validated['status'] ??= 'completed';

        $record = HealthRecord::create($validated);

        // Include the related rabbit in the response.
        $record->load('rabbit');

        return response()->json([
            'message' => 'Health record created successfully.',
            'data' => $record,
        ], 201);
    }

    /**
     * Retrieve one health record.
     */
    public function show(HealthRecord $healthRecord): JsonResponse
    {
        $healthRecord->load('rabbit');

        return response()->json([
            'data' => $healthRecord,
        ]);
    }

    /**
     * Update an existing health record.
     */
    public function update(
        Request $request,
        HealthRecord $healthRecord
    ): JsonResponse {
        $validated = $request->validate([
            'rabbit_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:rabbits,id',
            ],
            'record_date' => [
                'sometimes',
                'required',
                'date',
            ],
            'category' => [
                'sometimes',
                'required',
                'string',
                Rule::in([
                    'checkup',
                    'illness',
                    'vaccination',
                    'treatment',
                    'injury',
                    'surgery',
                    'parasite_control',
                    'other',
                ]),
            ],
            'title' => [
                'sometimes',
                'required',
                'string',
                'max:150',
            ],
            'diagnosis' => [
                'sometimes',
                'nullable',
                'string',
                'max:5000',
            ],
            'symptoms' => [
                'sometimes',
                'nullable',
                'string',
                'max:5000',
            ],
            'treatment' => [
                'sometimes',
                'nullable',
                'string',
                'max:5000',
            ],
            'medication' => [
                'sometimes',
                'nullable',
                'string',
                'max:150',
            ],
            'dosage' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],
            'administered_by' => [
                'sometimes',
                'nullable',
                'string',
                'max:150',
            ],
            'next_due_date' => [
                'sometimes',
                'nullable',
                'date',
            ],
            'cost' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
                'max:99999999.99',
            ],
            'status' => [
                'sometimes',
                'required',
                'string',
                Rule::in([
                    'completed',
                    'ongoing',
                    'follow_up',
                ]),
            ],
            'notes' => [
                'sometimes',
                'nullable',
                'string',
                'max:5000',
            ],
        ]);

        // Check date consistency using both submitted and stored values.
        $recordDate = $validated['record_date']
            ?? $healthRecord->record_date->toDateString();

        $nextDueDate = array_key_exists('next_due_date', $validated)
            ? $validated['next_due_date']
            : $healthRecord->next_due_date?->toDateString();

        if (
            $nextDueDate !== null
            && $nextDueDate < $recordDate
        ) {
            throw ValidationException::withMessages([
                'next_due_date' => [
                    'The next due date cannot be before the record date.',
                ],
            ]);
        }

        $healthRecord->update($validated);

        $healthRecord->load('rabbit');

        return response()->json([
            'message' => 'Health record updated successfully.',
            'data' => $healthRecord,
        ]);
    }

    /**
     * Delete a health record.
     */
    public function destroy(HealthRecord $healthRecord): JsonResponse
    {
        $healthRecord->delete();

        return response()->json([
            'message' => 'Health record deleted successfully.',
        ]);
    }
}