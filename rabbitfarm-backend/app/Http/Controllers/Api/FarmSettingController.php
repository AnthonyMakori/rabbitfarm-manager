<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FarmSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FarmSettingController extends Controller
{
    /**
     * Return the farm settings.
     * Create default settings automatically on the first request.
     */
    public function show(): JsonResponse
    {
        $settings = FarmSetting::firstOrCreate(
            ['id' => 1],
            [
                'farm_name' => 'RabbitFarm Manager',
                'country' => 'Kenya',
                'currency' => 'KES',
                'timezone' => 'Africa/Nairobi',
                'date_format' => 'Y-m-d',
            ]
        );

        return response()->json([
            'message' => 'Farm settings retrieved successfully.',
            'data' => $settings,
        ]);
    }

    /**
     * Validate and save the farm settings.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'farm_name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:2000'],
            'city' => ['nullable', 'string', 'max:255'],
            'country' => ['required', 'string', 'max:255'],

            'currency' => [
                'required',
                'string',
                'size:3',
                Rule::in(['KES', 'USD', 'EUR', 'GBP', 'TZS', 'UGX']),
            ],

            'timezone' => [
                'required',
                'timezone',
            ],

            'date_format' => [
                'required',
                Rule::in(['Y-m-d', 'd/m/Y', 'm/d/Y', 'd-m-Y']),
            ],
        ]);

        // Keep one settings record for this farm.
        $settings = FarmSetting::updateOrCreate(
            ['id' => 1],
            $validated
        );

        return response()->json([
            'message' => 'Farm settings saved successfully.',
            'data' => $settings,
        ]);
    }
}