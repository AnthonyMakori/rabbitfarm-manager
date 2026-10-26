<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rabbit;
use App\Models\RabbitEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RabbitEventController extends Controller
{
    /**
     * List the history for one rabbit.
     */
    public function index(Rabbit $rabbit): JsonResponse
    {
        $events = $rabbit->events()
            ->orderByDesc('event_date')
            ->orderByDesc('id')
            ->paginate(15);

        return response()->json($events);
    }

    /**
     * Record a new event for one rabbit.
     */
    public function store(Request $request, Rabbit $rabbit): JsonResponse
    {
        $validated = $request->validate([
            'event_type' => [
                'required',
                'string',
                Rule::in([
                    'weight',
                    'vaccination',
                    'medication',
                    'breeding',
                    'birth',
                    'illness',
                    'treatment',
                    'sale',
                    'other',
                ]),
            ],
            'title' => ['required', 'string', 'max:150'],
            'event_date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:5000'],
            'weight_kg' => ['nullable', 'numeric', 'gt:0', 'max:99999.999'],
            'cost' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'next_due_date' => ['nullable', 'date'],
        ]);

        // Associate the event through the relationship so the
        // correct rabbit_id is assigned by Laravel.
        $event = $rabbit->events()->create($validated);

        return response()->json([
            'message' => 'Rabbit history event recorded successfully.',
            'data' => $event,
        ], 201);
    }
}
