<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function overview(): JsonResponse
    {
        $today = Carbon::today();
        $monthStart = Carbon::now()->startOfMonth();
        $monthEnd = Carbon::now()->endOfMonth();
        $nextSevenDays = $today->copy()->addDays(7);

        // Only rabbits currently on the farm belong in the live population.
        $activeRabbits = DB::table('rabbits')
            ->where('status', 'active');

        $totalRabbits = (clone $activeRabbits)->count();

        $breedingDoes = (clone $activeRabbits)
            ->where('category', 'breeding')
            ->whereRaw('LOWER(sex) = ?', ['female'])
            ->count();

        $breedingBucks = (clone $activeRabbits)
            ->where('category', 'breeding')
            ->whereRaw('LOWER(sex) = ?', ['male'])
            ->count();

        $growingRabbits = (clone $activeRabbits)
            ->where('category', 'growing')
            ->count();

        $kits = (clone $activeRabbits)
            ->where('category', 'kit')
            ->count();

        // Sales registered during the current calendar month.
        $monthlySales = DB::table('sales')
            ->where('status', 'completed')
            ->whereBetween('sale_date', [
                $monthStart->toDateString(),
                $monthEnd->toDateString(),
            ]);

        $salesCount = (clone $monthlySales)->count();
        $salesTotal = (float) (clone $monthlySales)->sum('total_amount');
        $salesPaid = (float) (clone $monthlySales)->sum('amount_paid');

        $monthlyExpenses = (float) DB::table('expenses')
            ->whereBetween('expense_date', [
                $monthStart->toDateString(),
                $monthEnd->toDateString(),
            ])
            ->sum('amount');

        $lowStockQuery = DB::table('inventory_items')
            ->where('is_active', true)
            ->whereColumn('quantity_on_hand', '<=', 'reorder_level');

        $lowStockCount = (clone $lowStockQuery)->count();

        $lowStockItems = (clone $lowStockQuery)
            ->orderBy('quantity_on_hand')
            ->limit(5)
            ->get([
                'id',
                'item_code',
                'name',
                'category',
                'quantity_on_hand',
                'reorder_level',
                'unit',
            ]);

        $feedItemCount = DB::table('inventory_items')
            ->where('is_active', true)
            ->where('category', 'feed')
            ->count();

        $upcomingKindlings = DB::table('breedings')
            ->whereNotNull('expected_kindling_date')
            ->whereBetween('expected_kindling_date', [
                $today->toDateString(),
                $nextSevenDays->toDateString(),
            ])
            ->count();

        $breedingReviews = DB::table('breedings')
            ->where('pregnancy_status', 'unknown')
            ->count();

        $activeCustomers = DB::table('customers')
            ->where('is_active', true)
            ->count();

        // Prepare a unified recent-activity list from existing records.
        $activities = collect();

        $recentRabbits = DB::table('rabbits')
            ->latest('created_at')
            ->limit(5)
            ->get(['id', 'rabbit_code', 'name', 'created_at']);

        foreach ($recentRabbits as $rabbit) {
            $activities->push([
                'id' => 'rabbit-' . $rabbit->id,
                'type' => 'rabbit',
                'title' => 'Rabbit registered',
                'detail' => trim(
                    ($rabbit->rabbit_code ?: 'Rabbit #' . $rabbit->id)
                    . ($rabbit->name ? ' · ' . $rabbit->name : '')
                ),
                'date' => $rabbit->created_at,
                'href' => '/rabbits',
            ]);
        }

        $recentSales = DB::table('sales')
            ->latest('created_at')
            ->limit(5)
            ->get(['id', 'sale_number', 'total_amount', 'created_at']);

        foreach ($recentSales as $sale) {
            $activities->push([
                'id' => 'sale-' . $sale->id,
                'type' => 'sale',
                'title' => 'Sale recorded',
                'detail' => $sale->sale_number
                    . ' · KES ' . number_format((float) $sale->total_amount, 2),
                'date' => $sale->created_at,
                'href' => '/sales',
            ]);
        }

        $recentKindlings = DB::table('kindlings')
            ->latest('created_at')
            ->limit(5)
            ->get(['id', 'total_born', 'born_alive', 'created_at']);

        foreach ($recentKindlings as $kindling) {
            $activities->push([
                'id' => 'kindling-' . $kindling->id,
                'type' => 'kindling',
                'title' => 'Kindling recorded',
                'detail' => $kindling->born_alive . ' born alive out of '
                    . $kindling->total_born . ' kits',
                'date' => $kindling->created_at,
                'href' => '/kindlings',
            ]);
        }

        $recentExpenses = DB::table('expenses')
            ->latest('created_at')
            ->limit(5)
            ->get(['id', 'description', 'amount', 'created_at']);

        foreach ($recentExpenses as $expense) {
            $activities->push([
                'id' => 'expense-' . $expense->id,
                'type' => 'expense',
                'title' => 'Expense recorded',
                'detail' => $expense->description
                    . ' · KES ' . number_format((float) $expense->amount, 2),
                'date' => $expense->created_at,
                'href' => '/expenses',
            ]);
        }

        $recentActivities = $activities
            ->sortByDesc(fn (array $activity) => $activity['date'] ?? '')
            ->take(8)
            ->values()
            ->map(function (array $activity) {
                $activity['date'] = $activity['date']
                    ? Carbon::parse($activity['date'])->toISOString()
                    : null;

                return $activity;
            });

        return response()->json([
            'data' => [
                'generated_at' => Carbon::now()->toISOString(),

                'stats' => [
                    'total_rabbits' => $totalRabbits,
                    'breeding_does' => $breedingDoes,
                    'breeding_bucks' => $breedingBucks,
                    'growing_rabbits' => $growingRabbits,
                    'kits' => $kits,
                    'feed_items' => $feedItemCount,
                    'sales_count' => $salesCount,
                    'sales_total' => round($salesTotal, 2),
                    'sales_paid' => round($salesPaid, 2),
                    'sales_outstanding' => round(
                        max(0, $salesTotal - $salesPaid),
                        2
                    ),
                    'expenses_total' => round($monthlyExpenses, 2),
                    'low_stock_count' => $lowStockCount,
                    'active_customers' => $activeCustomers,
                ],

                'population' => [
                    [
                        'key' => 'does',
                        'label' => 'Breeding does',
                        'count' => $breedingDoes,
                    ],
                    [
                        'key' => 'bucks',
                        'label' => 'Breeding bucks',
                        'count' => $breedingBucks,
                    ],
                    [
                        'key' => 'growing',
                        'label' => 'Growing rabbits',
                        'count' => $growingRabbits,
                    ],
                    [
                        'key' => 'kits',
                        'label' => 'Registered kits',
                        'count' => $kits,
                    ],
                ],

                'reminders' => [
                    [
                        'key' => 'breeding-reviews',
                        'title' => 'Breeding records to review',
                        'description' => 'Records with an unknown pregnancy status',
                        'count' => $breedingReviews,
                        'href' => '/breedings',
                    ],
                    [
                        'key' => 'kindlings',
                        'title' => 'Upcoming kindling',
                        'description' => 'Expected in the next 7 days',
                        'count' => $upcomingKindlings,
                        'href' => '/breedings',
                    ],
                    [
                        'key' => 'low-stock',
                        'title' => 'Low stock alerts',
                        'description' => 'Items at or below reorder level',
                        'count' => $lowStockCount,
                        'href' => '/inventory',
                    ],
                ],

                'low_stock_items' => $lowStockItems,
                'recent_activities' => $recentActivities,

                'period' => [
                    'start' => $monthStart->toDateString(),
                    'end' => $monthEnd->toDateString(),
                    'label' => $monthStart->format('F Y'),
                ],
            ],
        ]);
    }
}
