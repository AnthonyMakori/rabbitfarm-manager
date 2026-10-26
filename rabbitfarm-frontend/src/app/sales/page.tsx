"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";

import {
  createSale,
  getSaleCustomers,
  getSaleRabbits,
  getSales,
  recordSalePayment,
  type CreatePaymentInput,
  type Sale,
  type SaleCustomer,
  type SaleRabbit,
} from "@/lib/sales-api";

type PaymentMethod = CreatePaymentInput["payment_method"];

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

function localDate(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function localDateTime(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function money(value: number | string | null | undefined): string {
  return `KSh ${Number(value ?? 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string): string {
  if (!value) return "—";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export default function SalesPage() {
  const [customers, setCustomers] = useState<SaleCustomer[]>([]);
  const [rabbits, setRabbits] = useState<SaleRabbit[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // New sale form state
  const [customerId, setCustomerId] = useState("");
  const [saleDate, setSaleDate] = useState(localDate());
  const [saleNotes, setSaleNotes] = useState("");
  const [selectedRabbitIds, setSelectedRabbitIds] = useState<number[]>([]);
  const [prices, setPrices] = useState<Record<number, string>>({});

  // History filters
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Payment form state
  const [paymentSaleId, setPaymentSaleId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("mpesa");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(localDateTime());
  const [paymentNotes, setPaymentNotes] = useState("");

  const refreshData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");

    try {
      const [customerData, rabbitData, salesData] = await Promise.all([
        getSaleCustomers(),
        getSaleRabbits(),
        getSales(),
      ]);

      setCustomers(
        customerData.filter((customer) => customer.is_active !== false),
      );

      // Never offer rabbits already sold or otherwise inactive.
      setRabbits(rabbitData.filter((rabbit) => rabbit.status === "active"));
      setSales(salesData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Sales data. Check that the Laravel API is running.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const selectedRabbits = useMemo(
    () =>
      rabbits.filter((rabbit) => selectedRabbitIds.includes(rabbit.id)),
    [rabbits, selectedRabbitIds],
  );

  const estimatedTotal = useMemo(
    () =>
      selectedRabbits.reduce(
        (sum, rabbit) => sum + (Number(prices[rabbit.id]) || 0),
        0,
      ),
    [selectedRabbits, prices],
  );

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const matchesSearch =
        !term ||
        sale.sale_number?.toLowerCase().includes(term) ||
        sale.customer?.name?.toLowerCase().includes(term) ||
        sale.customer?.customer_code?.toLowerCase().includes(term) ||
        sale.items?.some(
          (item) =>
            item.rabbit?.rabbit_code?.toLowerCase().includes(term) ||
            item.rabbit?.name?.toLowerCase().includes(term),
        );

      const matchesPayment =
        paymentFilter === "all" || sale.payment_status === paymentFilter;

      return matchesSearch && matchesPayment;
    });
  }, [sales, search, paymentFilter]);

  const totalSales = sales.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0,
  );

  const totalPaid = sales.reduce(
    (sum, sale) => sum + Number(sale.amount_paid || 0),
    0,
  );

  const totalOutstanding = sales.reduce(
    (sum, sale) =>
      sum +
      Math.max(
        0,
        Number(sale.total_amount || 0) - Number(sale.amount_paid || 0),
      ),
    0,
  );

  function toggleRabbit(rabbitId: number) {
    setSelectedRabbitIds((current) =>
      current.includes(rabbitId)
        ? current.filter((id) => id !== rabbitId)
        : [...current, rabbitId],
    );
  }

  async function handleCreateSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    if (selectedRabbitIds.length === 0) {
      setError("Select at least one active rabbit.");
      return;
    }

    const items = selectedRabbits.map((rabbit) => ({
      rabbit_id: rabbit.id,
      unit_price: Number(prices[rabbit.id]),
    }));

    if (
      items.some(
        (item) =>
          !Number.isFinite(item.unit_price) ||
          item.unit_price <= 0 ||
          Math.round(item.unit_price * 100) !== item.unit_price * 100,
      )
    ) {
      setError("Enter a valid price greater than zero for every selected rabbit (maximum two decimal places).");
      return;
    }

    setSubmitting(true);

    try {
      const sale = await createSale({
        customer_id: Number(customerId),
        sale_date: saleDate,
        notes: saleNotes.trim() || undefined,
        items,
      });

      setNotice(`Sale ${sale.sale_number} was recorded successfully.`);
      setCustomerId("");
      setSaleDate(localDate());
      setSaleNotes("");
      setSelectedRabbitIds([]);
      setPrices({});
      setPaymentSaleId(null);

      await refreshData(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to record the sale.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecordPayment(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!paymentSaleId) return;

    const amount = Number(paymentAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Math.round(amount * 100) !== amount * 100
    ) {
      setError("Enter a valid payment amount with no more than two decimal places.");
      return;
    }

    setSubmitting(true);

    try {
      await recordSalePayment(paymentSaleId, {
        amount,
        payment_method: paymentMethod,
        reference: paymentReference.trim() || undefined,
        paid_at: paymentDate
          ? new Date(paymentDate).toISOString()
          : undefined,
        notes: paymentNotes.trim() || undefined,
      });

      setNotice("Payment recorded successfully.");
      setPaymentSaleId(null);
      setPaymentAmount("");
      setPaymentMethod("mpesa");
      setPaymentReference("");
      setPaymentDate(localDateTime());
      setPaymentNotes("");

      await refreshData(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to record payment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const paymentSale = sales.find((sale) => sale.id === paymentSaleId);

  const paymentBalance = paymentSale
    ? Math.max(
        0,
        Number(paymentSale.total_amount) - Number(paymentSale.amount_paid),
      )
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar />

      <main className="min-w-0 flex-1 lg:ml-64">
        <AppHeader />

        <div className="mx-auto max-w-9xl space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ShoppingCart className="h-4 w-4" />
                Farm management / Sales
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Sales
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Record rabbit sales, track payments, and monitor outstanding balances.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void refreshData()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{notice}</p>
            </div>
          )}

          {/* Sales summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total sales"
              value={money(totalSales)}
              description={`${sales.length} recorded sales`}
            />
            <SummaryCard
              title="Payments received"
              value={money(totalPaid)}
              description="Recorded customer payments"
            />
            <SummaryCard
              title="Outstanding balance"
              value={money(totalOutstanding)}
              description="Amount still owed"
            />
            <SummaryCard
              title="Available rabbits"
              value={String(rabbits.length)}
              description="Rabbits eligible for sale"
            />
          </div>

          {/* Create sale */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Record a sale</h2>
                <p className="text-sm text-slate-500">
                  Choose a customer and select the rabbits being sold.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSale} className="space-y-6 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="sale-customer"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Customer *
                  </label>
                  <select
                    id="sale-customer"
                    required
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.customer_code
                          ? ` (${customer.customer_code})`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {customers.length === 0 && !loading && (
                    <p className="mt-1 text-xs text-amber-700">
                      No active customers found. Create or activate a customer first.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="sale-date"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Sale date *
                  </label>
                  <input
                    id="sale-date"
                    type="date"
                    required
                    value={saleDate}
                    onChange={(event) => setSaleDate(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Select rabbits *
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Only rabbits currently marked active are listed.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {selectedRabbitIds.length} selected
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="w-12 px-4 py-3">Select</th>
                        <th className="px-4 py-3">Rabbit</th>
                        <th className="px-4 py-3">Breed</th>
                        <th className="px-4 py-3">Sex</th>
                        <th className="w-44 px-4 py-3">Selling price (KSh)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rabbits.map((rabbit) => {
                        const checked = selectedRabbitIds.includes(rabbit.id);

                        return (
                          <tr
                            key={rabbit.id}
                            className={checked ? "bg-emerald-50/50" : "hover:bg-slate-50"}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleRabbit(rabbit.id)}
                                aria-label={`Select rabbit ${rabbit.rabbit_code ?? rabbit.id}`}
                                className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">
                                {rabbit.rabbit_code || `Rabbit #${rabbit.id}`}
                              </div>
                              {rabbit.name && (
                                <div className="text-xs text-slate-500">
                                  {rabbit.name}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {rabbit.breed}
                            </td>
                            <td className="px-4 py-3 capitalize text-slate-600">
                              {rabbit.sex}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                required={checked}
                                disabled={!checked}
                                value={prices[rabbit.id] ?? ""}
                                onChange={(event) =>
                                  setPrices((current) => ({
                                    ...current,
                                    [rabbit.id]: event.target.value,
                                  }))
                                }
                                placeholder="0.00"
                                aria-label={`Selling price for rabbit ${rabbit.rabbit_code ?? rabbit.id}`}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-400"
                              />
                            </td>
                          </tr>
                        );
                      })}

                      {!loading && rabbits.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            No active rabbits available for sale.
                          </td>
                        </tr>
                      )}

                      {loading && (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                            Loading available rabbits...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label
                  htmlFor="sale-notes"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="sale-notes"
                  rows={2}
                  value={saleNotes}
                  onChange={(event) => setSaleNotes(event.target.value)}
                  placeholder="Add any notes about this sale..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex flex-col justify-between gap-4 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm text-slate-500">Sale total</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {money(estimatedTotal)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedRabbitIds.length} rabbit(s) · payment can be recorded after saving
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    loading ||
                    !customers.length ||
                    !selectedRabbitIds.length
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Saving sale..." : "Record sale"}
                </button>
              </div>
            </form>
          </section>

          {/* Payment form */}
          {paymentSale && (
            <section className="rounded-xl border border-emerald-200 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Record payment — {paymentSale.sale_number}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Outstanding balance:{" "}
                    <span className="font-semibold text-slate-900">
                      {money(paymentBalance)}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentSaleId(null)}
                  aria-label="Close payment form"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="grid gap-4 p-5 md:grid-cols-2">
                <div>
                  <label htmlFor="payment-amount" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Payment amount (KSh) *
                  </label>
                  <input
                    id="payment-amount"
                    type="number"
                    min="0.01"
                    max={paymentBalance}
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="payment-method" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Payment method *
                  </label>
                  <select
                    id="payment-method"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="payment-date" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Payment date and time *
                  </label>
                  <input
                    id="payment-date"
                    type="datetime-local"
                    required
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="payment-reference" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Reference (optional)
                  </label>
                  <input
                    id="payment-reference"
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    placeholder="e.g. M-Pesa transaction code"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="payment-notes" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Payment notes (optional)
                  </label>
                  <textarea
                    id="payment-notes"
                    rows={2}
                    value={paymentNotes}
                    onChange={(event) => setPaymentNotes(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex flex-wrap gap-3 md:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting || paymentBalance <= 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentSaleId(null)}
                    className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Sales history */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Sales history</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review recorded sales, payment status, and outstanding balances.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search sale, customer, rabbit..."
                    aria-label="Search sales"
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 sm:w-64"
                  />
                </div>
                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value)}
                  aria-label="Filter by payment status"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="all">All payment statuses</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partially paid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Sale</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Rabbits</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Paid</th>
                    <th className="px-5 py-3">Balance</th>
                    <th className="px-5 py-3">Payment status</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((sale) => {
                    const total = Number(sale.total_amount || 0);
                    const paid = Number(sale.amount_paid || 0);
                    const balance = Math.max(0, total - paid);

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {sale.sale_number}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatDate(sale.sale_date)}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-800">
                            {sale.customer?.name ?? `Customer #${sale.customer_id}`}
                          </div>
                          <div className="text-xs text-slate-500">
                            {sale.customer?.customer_code ?? ""}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-800">
                            {sale.items?.length ?? 0} rabbit(s)
                          </div>
                          <div className="mt-1 max-w-48 truncate text-xs text-slate-500">
                            {sale.items
                              ?.map((item) => item.rabbit?.rabbit_code || `#${item.rabbit_id}`)
                              .join(", ")}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                          {money(total)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          {money(paid)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                          {money(balance)}
                        </td>
                        <td className="px-5 py-4">
                          <PaymentStatus status={sale.payment_status} />
                        </td>
                        <td className="px-5 py-4">
                          {balance > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setError("");
                                setNotice("");
                                setPaymentSaleId(sale.id);
                                setPaymentAmount("");
                                setPaymentReference("");
                                setPaymentNotes("");
                                setPaymentDate(localDateTime());
                              }}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Add payment
                            </button>
                          ) : (
                            <span className="text-xs font-medium text-emerald-700">
                              Fully paid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center">
                        <ShoppingCart className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-3 font-medium text-slate-700">
                          No sales found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Record a sale above, or adjust your search and filters.
                        </p>
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Loading sales history...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
              Showing {filteredSales.length} of {sales.length} loaded sales.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function PaymentStatus({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    partial: "bg-amber-50 text-amber-700 ring-amber-600/20",
    unpaid: "bg-red-50 text-red-700 ring-red-600/20",
  };

  const labels: Record<string, string> = {
    paid: "Paid",
    partial: "Partially paid",
    unpaid: "Unpaid",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}