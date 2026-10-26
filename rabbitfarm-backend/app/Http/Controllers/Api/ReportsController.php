<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReportsController extends Controller
{
    /**
     * Return the farm's report and analytics overview.
     *
     * Optional query parameters:
     *   start_date=2026-10-01
     *   end_date=2026-10-31
     *
     * Date filters affect sales, payments, expenses, breeding, and
     * kindling reports. Rabbit totals and inventory are current-state
     * figures, not historical snapshots.
     */
    public function overview(Request $request)
    {
        // Validate optional report dates.
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => [
                'nullable',
                'date',
                'after_or_equal:start_date',
            ],
        ]);

        $startDate = $validated['start_date'] ?? null;
        $endDate = $validated['end_date'] ?? null;

        /*
         * Apply a date range to a query using its specified date column.
         * Each report can therefore use the appropriate business date.
         */
        $applyDateRange = function ($query, string $column) use (
            $startDate,
            $endDate
        ) {
            if ($startDate) {
                $query->whereDate($column, '>=', $startDate);
            }

            if ($endDate) {
                $query->whereDate($column, '<=', $endDate);
            }

            return $query;
        };

        /*
         * ---------------------------------------------------------
         * 1. RABBIT / FARM OVERVIEW
         * ---------------------------------------------------------
         *
         * These are current herd statistics, not date-filtered
         * historical figures.
         */
        $rabbitCountsByStatus = DB::table('rabbits')
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->orderBy('status')
            ->get();

        $totalRabbits = DB::table('rabbits')->count();

        $activeRabbits = DB::table('rabbits')
            ->where('status', 'active')
            ->count();

        $rabbitCountsByCategory = DB::table('rabbits')
            ->select('category', DB::raw('COUNT(*) as total'))
            ->groupBy('category')
            ->orderBy('category')
            ->get();

        $rabbitCountsBySex = DB::table('rabbits')
            ->select('sex', DB::raw('COUNT(*) as total'))
            ->groupBy('sex')
            ->orderBy('sex')
            ->get();

        $rabbitCountsByBreed = DB::table('rabbits')
            ->select('breed', DB::raw('COUNT(*) as total'))
            ->groupBy('breed')
            ->orderByDesc('total')
            ->get();

        /*
         * ---------------------------------------------------------
         * 2. SALES REPORT
         * ---------------------------------------------------------
         *
         * The sales table contains total_amount and amount_paid.
         * We use the sale_date to filter sales in the selected period.
         */
        $salesQuery = DB::table('sales')
            ->where('status', 'completed');

        $applyDateRange($salesQuery, 'sale_date');

        $salesSummary = $salesQuery
            ->selectRaw('
                COUNT(*) as total_sales,
                COALESCE(SUM(total_amount), 0) as sales_value,
                COALESCE(SUM(amount_paid), 0) as payments_recorded_on_sales,
                COALESCE(
                    SUM(GREATEST(total_amount - amount_paid, 0)),
                    0
                ) as outstanding_balance
            ')
            ->first();

        /*
         * Count rabbits sold through completed sales in the period.
         */
        $rabbitsSoldQuery = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', 'completed');

        $applyDateRange($rabbitsSoldQuery, 'sales.sale_date');

        $rabbitsSold = $rabbitsSoldQuery->count();

        /*
         * Actual recorded payments use sale_payments.paid_at.
         *
         * This can differ from payments_recorded_on_sales above:
         * the latter is the amount_paid total on sales made during
         * the selected period, while this is payment activity during
         * the selected period.
         */
        $paymentsQuery = DB::table('sale_payments')
            ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
            ->where('sales.status', 'completed');

        $applyDateRange($paymentsQuery, 'sale_payments.paid_at');

        $paymentsSummary = $paymentsQuery
            ->selectRaw('
                COALESCE(SUM(sale_payments.amount), 0) as payments_received,
                COUNT(sale_payments.id) as payment_transactions
            ')
            ->first();

        $salesByPaymentStatusQuery = DB::table('sales')
            ->where('status', 'completed');

        $applyDateRange($salesByPaymentStatusQuery, 'sale_date');

        $salesByPaymentStatus = $salesByPaymentStatusQuery
            ->select(
                'payment_status',
                DB::raw('COUNT(*) as total_sales'),
                DB::raw('COALESCE(SUM(total_amount), 0) as total_amount')
            )
            ->groupBy('payment_status')
            ->orderBy('payment_status')
            ->get();

        /*
         * ---------------------------------------------------------
         * 3. EXPENSES REPORT
         * ---------------------------------------------------------
         */
        $expensesQuery = DB::table('expenses');

        $applyDateRange($expensesQuery, 'expense_date');

        $expensesSummary = $expensesQuery
            ->selectRaw('
                COUNT(*) as total_expense_records,
                COALESCE(SUM(amount), 0) as total_expenses
            ')
            ->first();

        $expensesByCategoryQuery = DB::table('expenses');

        $applyDateRange($expensesByCategoryQuery, 'expense_date');

        $expensesByCategory = $expensesByCategoryQuery
            ->select(
                'category',
                DB::raw('COUNT(*) as expense_count'),
                DB::raw('COALESCE(SUM(amount), 0) as total_amount')
            )
            ->groupBy('category')
            ->orderByDesc('total_amount')
            ->get();

        $expensesByPaymentMethodQuery = DB::table('expenses');

        $applyDateRange($expensesByPaymentMethodQuery, 'expense_date');

        $expensesByPaymentMethod = $expensesByPaymentMethodQuery
            ->select(
                'payment_method',
                DB::raw('COUNT(*) as expense_count'),
                DB::raw('COALESCE(SUM(amount), 0) as total_amount')
            )
            ->groupBy('payment_method')
            ->orderByDesc('total_amount')
            ->get();

        /*
         * ---------------------------------------------------------
         * 4. PRELIMINARY OPERATING SUMMARY
         * ---------------------------------------------------------
         *
         * This is completed sales value minus recorded expenses
         * for the selected period.
         *
         * It is NOT final accounting profit. It excludes factors
         * such as inventory valuation changes, the cost of rabbits
         * sold, depreciation, and other costs not recorded as
         * expenses in this system.
         */
        $salesValue = (float) $salesSummary->sales_value;
        $totalExpenses = (float) $expensesSummary->total_expenses;

        $preliminaryOperatingSurplus = $salesValue - $totalExpenses;

        /*
         * ---------------------------------------------------------
         * 5. BREEDING REPORT
         * ---------------------------------------------------------
         */
        $breedingsQuery = DB::table('breedings');

        $applyDateRange($breedingsQuery, 'mating_date');

        $breedingSummary = $breedingsQuery
            ->selectRaw('
                COUNT(*) as total_breedings,
                SUM(
                    CASE WHEN status = "completed" THEN 1 ELSE 0 END
                ) as completed_breedings,
                SUM(
                    CASE WHEN pregnancy_status = "confirmed"
                    THEN 1 ELSE 0 END
                ) as confirmed_pregnancies,
                SUM(
                    CASE WHEN pregnancy_status = "negative"
                    THEN 1 ELSE 0 END
                ) as negative_pregnancy_assessments
            ')
            ->first();

        $breedingsByStatusQuery = DB::table('breedings');

        $applyDateRange($breedingsByStatusQuery, 'mating_date');

        $breedingsByStatus = $breedingsByStatusQuery
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->orderBy('status')
            ->get();

        /*
         * ---------------------------------------------------------
         * 6. KINDLING REPORT
         * ---------------------------------------------------------
         */
        $kindlingsQuery = DB::table('kindlings');

        $applyDateRange($kindlingsQuery, 'kindling_date');

        $kindlingSummary = $kindlingsQuery
            ->selectRaw('
                COUNT(*) as total_kindlings,
                COALESCE(SUM(total_born), 0) as total_kits_born,
                COALESCE(SUM(born_alive), 0) as kits_born_alive,
                COALESCE(SUM(stillborn), 0) as stillborn_kits,
                COALESCE(SUM(current_alive), 0) as current_alive_kits,
                COALESCE(SUM(weaned_count), 0) as kits_weaned
            ')
            ->first();

        /*
         * ---------------------------------------------------------
         * 7. INVENTORY REPORT
         * ---------------------------------------------------------
         *
         * These figures reflect current stock, not historical
         * inventory as of the selected report dates.
         */
        $activeInventoryQuery = DB::table('inventory_items')
            ->where('is_active', true);

        $inventorySummary = $activeInventoryQuery
            ->selectRaw('
                COUNT(*) as active_items,
                COALESCE(SUM(quantity_on_hand), 0) as total_quantity,
                COALESCE(
                    SUM(quantity_on_hand * unit_cost),
                    0
                ) as estimated_stock_value,
                SUM(
                    CASE
                        WHEN quantity_on_hand <= reorder_level
                        THEN 1
                        ELSE 0
                    END
                ) as low_stock_items
            ')
            ->first();

        $lowStockItems = DB::table('inventory_items')
            ->where('is_active', true)
            ->whereColumn('quantity_on_hand', '<=', 'reorder_level')
            ->select(
                'id',
                'item_code',
                'name',
                'category',
                'unit',
                'quantity_on_hand',
                'reorder_level'
            )
            ->orderBy('name')
            ->get();

        $inventoryByCategory = DB::table('inventory_items')
            ->where('is_active', true)
            ->select(
                'category',
                DB::raw('COUNT(*) as item_count'),
                DB::raw('COALESCE(SUM(quantity_on_hand), 0) as quantity')
            )
            ->groupBy('category')
            ->orderBy('category')
            ->get();

        /*
         * ---------------------------------------------------------
         * 8. CUSTOMER SUMMARY
         * ---------------------------------------------------------
         *
         * Customer totals represent the current customer register.
         */
        $customerSummary = DB::table('customers')
            ->selectRaw('
                COUNT(*) as total_customers,
                SUM(
                    CASE WHEN is_active = 1 THEN 1 ELSE 0 END
                ) as active_customers
            ')
            ->first();

        /*
         * Return a consistent JSON structure for the frontend.
         */
        return response()->json([
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],

            'farm' => [
                'total_rabbits' => (int) $totalRabbits,
                'active_rabbits' => (int) $activeRabbits,
                'rabbits_by_status' => $rabbitCountsByStatus,
                'rabbits_by_category' => $rabbitCountsByCategory,
                'rabbits_by_sex' => $rabbitCountsBySex,
                'rabbits_by_breed' => $rabbitCountsByBreed,
            ],

            'sales' => [
                'total_sales' => (int) $salesSummary->total_sales,
                'sales_value' => round($salesValue, 2),
                'payments_recorded_on_sales' => round(
                    (float) $salesSummary->payments_recorded_on_sales,
                    2
                ),
                'payments_received_in_period' => round(
                    (float) $paymentsSummary->payments_received,
                    2
                ),
                'payment_transactions' => (int) $paymentsSummary->payment_transactions,
                'outstanding_balance' => round(
                    (float) $salesSummary->outstanding_balance,
                    2
                ),
                'rabbits_sold' => (int) $rabbitsSold,
                'by_payment_status' => $salesByPaymentStatus,
            ],

            'expenses' => [
                'total_expense_records' => (int) $expensesSummary->total_expense_records,
                'total_expenses' => round($totalExpenses, 2),
                'by_category' => $expensesByCategory,
                'by_payment_method' => $expensesByPaymentMethod,
            ],

            'operating_summary' => [
                'sales_value' => round($salesValue, 2),
                'total_expenses' => round($totalExpenses, 2),
                'preliminary_operating_surplus' => round(
                    $preliminaryOperatingSurplus,
                    2
                ),
                'note' => 'Preliminary operating surplus equals completed sales value minus recorded expenses. It is not final accounting profit.',
            ],

            'breeding' => [
                'total_breedings' => (int) $breedingSummary->total_breedings,
                'completed_breedings' => (int) $breedingSummary->completed_breedings,
                'confirmed_pregnancies' => (int) $breedingSummary->confirmed_pregnancies,
                'negative_pregnancy_assessments' => (int) $breedingSummary->negative_pregnancy_assessments,
                'by_status' => $breedingsByStatus,
            ],

            'kindlings' => [
                'total_kindlings' => (int) $kindlingSummary->total_kindlings,
                'total_kits_born' => (int) $kindlingSummary->total_kits_born,
                'kits_born_alive' => (int) $kindlingSummary->kits_born_alive,
                'stillborn_kits' => (int) $kindlingSummary->stillborn_kits,
                'current_alive_kits' => (int) $kindlingSummary->current_alive_kits,
                'kits_weaned' => (int) $kindlingSummary->kits_weaned,
            ],

            'inventory' => [
                'active_items' => (int) $inventorySummary->active_items,
                'total_quantity' => (float) $inventorySummary->total_quantity,
                'estimated_stock_value' => round(
                    (float) $inventorySummary->estimated_stock_value,
                    2
                ),
                'low_stock_items' => (int) $inventorySummary->low_stock_items,
                'low_stock_list' => $lowStockItems,
                'by_category' => $inventoryByCategory,
            ],

            'customers' => [
                'total_customers' => (int) $customerSummary->total_customers,
                'active_customers' => (int) $customerSummary->active_customers,
            ],
        ]);
    }
}