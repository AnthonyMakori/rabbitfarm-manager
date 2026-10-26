
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RabbitController;
use App\Http\Controllers\Api\RabbitEventController;
use App\Http\Controllers\Api\BreedingController;
use App\Http\Controllers\Api\KindlingController;
use App\Http\Controllers\Api\HealthRecordController;
use App\Http\Controllers\HousingUnitController;
use App\Http\Controllers\HousingMovementController;
use App\Http\Controllers\InventoryItemController;
use App\Http\Controllers\InventoryMovementController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\ReportsController;
use App\Http\Controllers\Api\FarmSettingController;
use App\Http\Controllers\Api\DashboardController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Routes defined here automatically receive Laravel's "api" middleware.
| Authentication will use Laravel Passport.
|
*/

// Temporary authenticated-user endpoint.
// Passport will protect this route once authentication is configured.
Route::middleware('auth:api')->get('/user', function (Request $request) {
    return $request->user();
});

// Rabbit management API.
// These routes are temporarily public for local development.
// We will protect them with Passport after setting up authentication.
Route::apiResource('rabbits', RabbitController::class);


Route::apiResource('rabbits', RabbitController::class);

Route::get(
    'rabbits/{rabbit}/events',
    [RabbitEventController::class, 'index']
);

Route::post(
    'rabbits/{rabbit}/events',
    [RabbitEventController::class, 'store']
);

Route::get('/breedings', [BreedingController::class, 'index']);
Route::post('/breedings', [BreedingController::class, 'store']);
Route::get('/breedings/{breeding}', [BreedingController::class, 'show']);
Route::put('/breedings/{breeding}', [BreedingController::class, 'update']);
Route::delete('/breedings/{breeding}', [BreedingController::class, 'destroy']);

Route::get('/kindlings', [KindlingController::class, 'index']);
Route::post('/kindlings', [KindlingController::class, 'store']);
Route::get('/kindlings/{kindling}', [KindlingController::class, 'show']);
Route::put('/kindlings/{kindling}', [KindlingController::class, 'update']);
Route::delete('/kindlings/{kindling}', [KindlingController::class, 'destroy']);

Route::get('/health-records', [HealthRecordController::class, 'index']);
Route::post('/health-records', [HealthRecordController::class, 'store']);
Route::get('/health-records/{healthRecord}', [HealthRecordController::class, 'show']);
Route::put('/health-records/{healthRecord}', [HealthRecordController::class, 'update']);
Route::delete('/health-records/{healthRecord}', [HealthRecordController::class, 'destroy']);


/*
|--------------------------------------------------------------------------
| Housing Management
|--------------------------------------------------------------------------
*/

// Create, list, view, update, and delete housing units.
Route::apiResource('housing-units', HousingUnitController::class);

// View housing movement history and record assignments/transfers.
Route::get(
    'housing-movements',
    [HousingMovementController::class, 'index']
);

Route::post(
    'housing-movements',
    [HousingMovementController::class, 'store']
);

// Unassign a rabbit from its current housing unit.
Route::post(
    'rabbits/{rabbit}/unassign-housing',
    [HousingMovementController::class, 'unassign']
);

// Inventory item management
Route::apiResource('inventory-items', InventoryItemController::class);

// Stock movement history and recording
Route::get(
    'inventory-movements',
    [InventoryMovementController::class, 'index']
);

Route::post(
    'inventory-movements',
    [InventoryMovementController::class, 'store']
);

Route::apiResource('customers', CustomerController::class);

// Sales: list, create, and view individual sales.
Route::apiResource('sales', SaleController::class)
    ->only(['index', 'store', 'show']);

// Record a payment against a specific sale.
Route::post('sales/{sale}/payments', [
    SaleController::class,
    'storePayment',
]);

Route::apiResource('expenses', ExpenseController::class);

// Reports and analytics dashboard.
Route::get('/reports/overview', [
    ReportsController::class,
    'overview',
]);

// Farm settings
Route::get('/settings/farm', [FarmSettingController::class, 'show']);
Route::put('/settings/farm', [FarmSettingController::class, 'update']);

Route::get('/dashboard/overview', [DashboardController::class, 'overview']);