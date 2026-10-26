"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Download,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  Wallet,
  X,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";

import {
  createExpense,
  deleteExpense,
  EXPENSE_CATEGORIES,
  getExpenses,
  PAYMENT_METHODS,
  updateExpense,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
  type ExpensePaymentMethod,
} from "@/lib/expenses-api";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  feed: "Feed",
  veterinary: "Veterinary care",
  medicine: "Medicine",
  housing: "Housing",
  equipment: "Equipment",
  labor: "Labor",
  transport: "Transport",
  utilities: "Utilities",
  breeding: "Breeding",
  other: "Other",
};

const PAYMENT_LABELS: Record<ExpensePaymentMethod, string> = {
  cash: "Cash",
  mpesa: "M-Pesa",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
};

const EMPTY_FORM: ExpenseInput = {
  category: "feed",
  description: "",
  amount: 0,
  expense_date: localDate(),
  paid_to: "",
  payment_method: "cash",
  reference: "",
  notes: "",
};

function localDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
}

function money(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dateLabel(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as ExpenseCategory] ?? category;
}

function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method as ExpensePaymentMethod] ?? method;
}

function monthStart(): string {
  return `${localDate().slice(0, 7)}-01`;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseInput>({
    ...EMPTY_FORM,
    expense_date: localDate(),
  });

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getExpenses({
        per_page: 100,
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });

      setExpenses(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load expenses. Check your API connection.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, dateFrom, dateTo]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const totalFiltered = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses],
  );

  const currentMonthTotal = useMemo(() => {
    const start = monthStart();
    const currentMonth = localDate().slice(0, 7);

    return expenses.reduce((sum, expense) => {
      if (expense.expense_date.slice(0, 7) !== currentMonth) return sum;
      return sum + Number(expense.amount || 0);
    }, 0);
  }, [expenses]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    expenses.forEach((expense) => {
      totals[expense.category] =
        (totals[expense.category] ?? 0) + Number(expense.amount || 0);
    });

    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  function openCreateForm() {
    setEditingExpense(null);
    setForm({ ...EMPTY_FORM, expense_date: localDate() });
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  function openEditForm(expense: Expense) {
    setEditingExpense(expense);
    setForm({
      category: expense.category,
      description: expense.description,
      amount: Number(expense.amount),
      expense_date: expense.expense_date.slice(0, 10),
      paid_to: expense.paid_to ?? "",
      payment_method: expense.payment_method,
      reference: expense.reference ?? "",
      notes: expense.notes ?? "",
    });
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  function updateField<K extends keyof ExpenseInput>(
    key: K,
    value: ExpenseInput[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload: ExpenseInput = {
        ...form,
        description: form.description.trim(),
        amount: Number(form.amount),
        paid_to: form.paid_to?.trim() || "",
        reference: form.reference?.trim() || "",
        notes: form.notes?.trim() || "",
      };

      if (!payload.description) {
        throw new Error("Please enter an expense description.");
      }

      if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
        throw new Error("The expense amount must be greater than zero.");
      }

      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
        setSuccess("Expense updated successfully.");
      } else {
        await createExpense(payload);
        setSuccess("Expense recorded successfully.");
      }

      setFormOpen(false);
      setEditingExpense(null);
      setForm({ ...EMPTY_FORM, expense_date: localDate() });

      await loadExpenses();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save the expense.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expense: Expense) {
    const confirmed = window.confirm(
      `Delete "${expense.description}" (${money(expense.amount)})? This cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deleteExpense(expense.id);
      setSuccess("Expense deleted successfully.");
      await loadExpenses();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete the expense.",
      );
    }
  }

  function exportCsv() {
    const headers = [
      "Date",
      "Category",
      "Description",
      "Paid To",
      "Payment Method",
      "Amount (KES)",
      "Reference",
      "Notes",
    ];

    const rows = expenses.map((expense) => [
      expense.expense_date,
      categoryLabel(expense.category),
      expense.description,
      expense.paid_to ?? "",
      paymentLabel(expense.payment_method),
      Number(expense.amount).toFixed(2),
      expense.reference ?? "",
      expense.notes ?? "",
    ]);

    const escapeCsv = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `rabbitfarm-expenses-${localDate()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar />

      <div className="min-w-0 flex-1 lg:ml-64">
        <AppHeader />

        <main className="mx-auto max-w-9xl space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-emerald-700">
                Farm finances
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Expenses
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Record, categorize, and monitor your rabbit farm spending.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportCsv}
                disabled={expenses.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={17} />
                Export CSV
              </button>

              <button
                onClick={openCreateForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
              >
                <Plus size={18} />
                Record expense
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <span className="min-w-0 flex-1">{error}</span>
              <button
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
              <span className="min-w-0 flex-1">{success}</span>
              <button
                onClick={() => setSuccess("")}
                aria-label="Dismiss success message"
              >
                <X size={18} />
              </button>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total expenses"
              value={money(totalFiltered)}
              description="For the selected filters"
              icon={<Wallet size={21} />}
            />
            <SummaryCard
              title="This month"
              value={money(currentMonthTotal)}
              description="Current month in loaded records"
              icon={<CalendarDays size={21} />}
            />
            <SummaryCard
              title="Expense records"
              value={expenses.length.toLocaleString("en-KE")}
              description="Records currently loaded"
              icon={<ClipboardList size={21} />}
            />
            <SummaryCard
              title="Largest category"
              value={
                categoryTotals.length
                  ? categoryLabel(categoryTotals[0][0])
                  : "—"
              }
              description={
                categoryTotals.length
                  ? money(categoryTotals[0][1])
                  : "No expenses recorded"
              }
              icon={<TrendingDown size={21} />}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Expense history
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Search records or narrow them by category and date.
                    </p>
                  </div>
                  <button
                    onClick={() => void loadExpenses()}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
                  >
                    <RefreshCw
                      size={15}
                      className={loading ? "animate-spin" : ""}
                    />
                    Refresh
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="relative sm:col-span-2 xl:col-span-1">
                    <span className="sr-only">Search expenses</span>
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search expenses..."
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="relative">
                    <span className="sr-only">Filter by category</span>
                    <select
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm outline-none focus:border-emerald-600"
                    >
                      <option value="">All categories</option>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {categoryLabel(category)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </label>

                  <label>
                    <span className="sr-only">Start date</span>
                    <input
                      aria-label="Start date"
                      type="date"
                      value={dateFrom}
                      max={dateTo || undefined}
                      onChange={(event) => setDateFrom(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                    />
                  </label>

                  <label>
                    <span className="sr-only">End date</span>
                    <input
                      aria-label="End date"
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(event) => setDateTo(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                    />
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold">Expense</th>
                      <th className="px-5 py-3 font-semibold">Category</th>
                      <th className="px-5 py-3 font-semibold">Payment</th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Amount
                      </th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-14 text-center">
                          <Loader2
                            className="mx-auto animate-spin text-emerald-700"
                            size={25}
                          />
                          <p className="mt-3 text-slate-500">
                            Loading expenses...
                          </p>
                        </td>
                      </tr>
                    ) : expenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-14 text-center">
                          <CircleDollarSign
                            size={36}
                            className="mx-auto text-slate-300"
                          />
                          <p className="mt-3 font-medium text-slate-700">
                            No expenses found
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Record your first expense or change the filters.
                          </p>
                          <button
                            onClick={openCreateForm}
                            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                          >
                            Record first expense
                          </button>
                        </td>
                      </tr>
                    ) : (
                      expenses.map((expense) => (
                        <tr
                          key={expense.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                            {dateLabel(expense.expense_date)}
                          </td>
                          <td className="px-5 py-4">
                            <p className="max-w-[240px] truncate font-medium text-slate-900">
                              {expense.description}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {expense.paid_to || "No payee specified"}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                              {categoryLabel(expense.category)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                            {paymentLabel(expense.payment_method)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-slate-900">
                            {money(expense.amount)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => openEditForm(expense)}
                                title="Edit expense"
                                aria-label={`Edit ${expense.description}`}
                                className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => void handleDelete(expense)}
                                title="Delete expense"
                                aria-label={`Delete ${expense.description}`}
                                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  {!loading && expenses.length > 0 && (
                    <tfoot className="border-t border-slate-200 bg-slate-50">
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-4 text-right font-semibold text-slate-700"
                        >
                          Filtered total
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900">
                          {money(totalFiltered)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Spending by category
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Breakdown of expenses currently loaded.
                </p>
              </div>

              {categoryTotals.length === 0 ? (
                <div className="py-12 text-center">
                  <TrendingDown
                    size={34}
                    className="mx-auto text-slate-300"
                  />
                  <p className="mt-3 text-sm text-slate-500">
                    Category totals will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  {categoryTotals.map(([category, amount]) => {
                    const percentage =
                      totalFiltered > 0 ? (amount / totalFiltered) * 100 : 0;

                    return (
                      <div key={category}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-slate-700">
                            {categoryLabel(category)}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {money(amount)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-600 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="mt-1 text-right text-xs text-slate-400">
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-7 rounded-xl bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <CircleDollarSign
                    size={20}
                    className="mt-0.5 shrink-0 text-emerald-700"
                  />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Expense tracking tip
                    </p>
                    <p className="mt-1 text-xs leading-5 text-emerald-800">
                      Enter a clear description and payment reference for each
                      transaction. This makes your farm records easier to
                      reconcile later.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {formOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !saving) {
                  setFormOpen(false);
                }
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="expense-form-title"
                className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                  <div>
                    <h2
                      id="expense-form-title"
                      className="text-lg font-bold text-slate-900"
                    >
                      {editingExpense ? "Edit expense" : "Record an expense"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Enter the details of the farm expense.
                    </p>
                  </div>
                  <button
                    onClick={() => setFormOpen(false)}
                    disabled={saving}
                    aria-label="Close form"
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Description <span className="text-red-500">*</span>
                      </span>
                      <input
                        required
                        maxLength={255}
                        value={form.description}
                        onChange={(event) =>
                          updateField("description", event.target.value)
                        }
                        placeholder="e.g. 10 bags of rabbit pellets"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Category <span className="text-red-500">*</span>
                      </span>
                      <select
                        required
                        value={form.category}
                        onChange={(event) =>
                          updateField(
                            "category",
                            event.target.value as ExpenseCategory,
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                      >
                        {EXPENSE_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {categoryLabel(category)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Amount (KES) <span className="text-red-500">*</span>
                      </span>
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.amount || ""}
                        onChange={(event) =>
                          updateField(
                            "amount",
                            event.target.value === ""
                              ? 0
                              : Number(event.target.value),
                          )
                        }
                        placeholder="0.00"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Expense date <span className="text-red-500">*</span>
                      </span>
                      <input
                        required
                        type="date"
                        value={form.expense_date}
                        onChange={(event) =>
                          updateField("expense_date", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Payment method <span className="text-red-500">*</span>
                      </span>
                      <select
                        required
                        value={form.payment_method}
                        onChange={(event) =>
                          updateField(
                            "payment_method",
                            event.target.value as ExpensePaymentMethod,
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {paymentLabel(method)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Paid to / supplier
                      </span>
                      <input
                        maxLength={150}
                        value={form.paid_to ?? ""}
                        onChange={(event) =>
                          updateField("paid_to", event.target.value)
                        }
                        placeholder="Supplier or service provider"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Receipt / reference
                      </span>
                      <input
                        maxLength={150}
                        value={form.reference ?? ""}
                        onChange={(event) =>
                          updateField("reference", event.target.value)
                        }
                        placeholder="e.g. M-Pesa transaction code"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                      />
                    </label>

                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Notes
                      </span>
                      <textarea
                        rows={3}
                        maxLength={5000}
                        value={form.notes ?? ""}
                        onChange={(event) =>
                          updateField("notes", event.target.value)
                        }
                        placeholder="Optional additional details..."
                        className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                      />
                    </label>

                    {error && (
                      <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:px-6">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setFormOpen(false)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={17} />
                      )}
                      {saving
                        ? "Saving..."
                        : editingExpense
                          ? "Save changes"
                          : "Save expense"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>
        <div className="shrink-0 rounded-xl bg-emerald-50 p-3 text-emerald-700">
          {icon}
        </div>
      </div>
    </div>
  );
}