
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Rabbit,
  Wallet,
  ReceiptText,
  AlertTriangle,
  Users,
  Wheat,
  CalendarDays,
  Clock3,
  ArrowRight,
  RefreshCw,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import StatCard from "@/components/dashboard/StatCard";
import FarmOverview from "@/components/dashboard/FarmOverview";
import RecentActivity from "@/components/dashboard/RecentActivity";

import {
  getDashboardOverview,
  type DashboardOverview,
} from "@/lib/dashboard-api";

function formatKES(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatLastUpdated(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(date);
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await getDashboardOverview();
      setDashboard(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = dashboard?.stats;

  const statCards = stats
    ? [
        {
          title: "Active rabbits",
          value: stats.total_rabbits.toLocaleString(),
          description: "Currently on the farm",
          icon: Rabbit,
          iconColor: "text-green-700",
          iconBackground: "bg-green-50",
        },
        {
          title: "Sales this month",
          value: formatKES(stats.sales_total),
          description: `${stats.sales_count} completed sales`,
          icon: Wallet,
          iconColor: "text-blue-700",
          iconBackground: "bg-blue-50",
        },
        {
          title: "Expenses this month",
          value: formatKES(stats.expenses_total),
          description: "Recorded operating expenses",
          icon: ReceiptText,
          iconColor: "text-amber-700",
          iconBackground: "bg-amber-50",
        },
        {
          title: "Low-stock items",
          value: stats.low_stock_count.toLocaleString(),
          description: "At or below reorder level",
          icon: AlertTriangle,
          iconColor: "text-red-700",
          iconBackground: "bg-red-50",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[#f8f9f6] text-stone-900">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        <div className="min-w-0 flex-1 lg:ml-64">
          <AppHeader />

          <main className="mx-auto max-w-[1600px] p-5 sm:p-8">
            {/* Dashboard heading */}
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-green-700">
                  FARM OVERVIEW
                </p>

                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Dashboard
                </h1>

                <p className="mt-2 text-sm text-stone-500">
                  Your farm at a glance, based on recorded operational data.
                </p>

                {dashboard && (
                  <p className="mt-2 text-xs text-stone-400">
                    Financial period: {dashboard.period.label}
                    {" · "}
                    Updated {formatLastUpdated(dashboard.generated_at)}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void loadDashboard(true)}
                  disabled={loading || refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? (
                    <LoaderCircle className="animate-spin" size={17} />
                  ) : (
                    <RefreshCw size={17} />
                  )}
                  Refresh
                </button>

                <Link
                  href="/rabbits/new"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
                >
                  <Rabbit size={18} />
                  Register rabbit
                </Link>
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div
                role="alert"
                className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center"
              >
                <AlertCircle size={20} className="shrink-0" />
                <p className="flex-1">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadDashboard()}
                  className="self-start rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold hover:bg-red-100 sm:self-auto"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Loading state */}
            {loading && !dashboard ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center">
                <LoaderCircle
                  className="mx-auto animate-spin text-green-700"
                  size={30}
                />
                <p className="mt-4 text-sm font-medium text-stone-700">
                  Loading your live farm data...
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Retrieving records from the farm database.
                </p>
              </div>
            ) : dashboard ? (
              <>
                {/* Primary statistics */}
                <section
                  aria-label="Farm statistics"
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                  {statCards.map((stat) => (
                    <StatCard key={stat.title} {...stat} />
                  ))}
                </section>

                {/* Additional financial and operational totals */}
                <section
                  aria-label="Additional farm totals"
                  className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                  <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <p className="text-sm text-stone-500">Payments received</p>
                    <p className="mt-2 text-xl font-bold text-green-700">
                      {formatKES(stats!.sales_paid)}
                    </p>
                    <p className="mt-1 text-xs text-stone-400">
                      Against this month's sales
                    </p>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <p className="text-sm text-stone-500">Sales outstanding</p>
                    <p className="mt-2 text-xl font-bold text-amber-700">
                      {formatKES(stats!.sales_outstanding)}
                    </p>
                    <p className="mt-1 text-xs text-stone-400">
                      Unpaid balance on this month's sales
                    </p>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-stone-500">
                      <Users size={17} />
                      <p className="text-sm">Active customers</p>
                    </div>
                    <p className="mt-2 text-xl font-bold">
                      {stats!.active_customers.toLocaleString()}
                    </p>
                    <Link
                      href="/customers"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline"
                    >
                      View customers <ArrowRight size={13} />
                    </Link>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-stone-500">
                      <Wheat size={17} />
                      <p className="text-sm">Active feed items</p>
                    </div>
                    <p className="mt-2 text-xl font-bold">
                      {stats!.feed_items.toLocaleString()}
                    </p>
                    <Link
                      href="/inventory"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline"
                    >
                      View inventory <ArrowRight size={13} />
                    </Link>
                  </div>
                </section>

                {/* Population and recent activity */}
                <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
                  <FarmOverview
                    population={dashboard.population}
                    total={stats!.total_rabbits}
                  />

                  <RecentActivity
                    activities={dashboard.recent_activities}
                  />
                </div>

                {/* Reminders */}
                <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                      <CalendarDays size={21} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Farm reminders</h2>
                      <p className="mt-1 text-sm text-stone-500">
                        Items that may need your attention
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {dashboard.reminders.map((reminder) => (
                      <Link
                        key={reminder.key}
                        href={reminder.href}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-stone-200 p-4 transition hover:border-green-200 hover:bg-green-50/50"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <Clock3
                            size={19}
                            className="mt-0.5 shrink-0 text-stone-400 group-hover:text-green-700"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-800">
                              {reminder.title}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-stone-500">
                              {reminder.description}
                            </p>
                          </div>
                        </div>

                        <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-amber-50 px-2 text-sm font-bold text-amber-700">
                          {reminder.count}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>

                {/* Low-stock list */}
                <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                      <h2 className="text-lg font-bold">
                        Inventory requiring attention
                      </h2>
                      <p className="mt-1 text-sm text-stone-500">
                        Active items at or below their reorder levels
                      </p>
                    </div>

                    <Link
                      href="/inventory"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:underline"
                    >
                      Manage inventory <ArrowRight size={16} />
                    </Link>
                  </div>

                  {dashboard.low_stock_items.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm font-medium text-green-700">
                        No low-stock items
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        All active inventory items are above their reorder levels.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left text-sm">
                        <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Item</th>
                            <th className="px-5 py-3 font-semibold">Category</th>
                            <th className="px-5 py-3 text-right font-semibold">
                              In stock
                            </th>
                            <th className="px-5 py-3 text-right font-semibold">
                              Reorder at
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {dashboard.low_stock_items.map((item) => (
                            <tr key={item.id} className="hover:bg-stone-50">
                              <td className="px-5 py-4">
                                <p className="font-semibold text-stone-800">
                                  {item.name}
                                </p>
                                <p className="mt-1 text-xs text-stone-400">
                                  {item.item_code}
                                </p>
                              </td>
                              <td className="px-5 py-4 capitalize text-stone-600">
                                {item.category}
                              </td>
                              <td className="px-5 py-4 text-right font-semibold text-red-700">
                                {Number(item.quantity_on_hand).toLocaleString(
                                  "en-KE",
                                )}{" "}
                                {item.unit}
                              </td>
                              <td className="px-5 py-4 text-right text-stone-600">
                                {Number(item.reorder_level).toLocaleString(
                                  "en-KE",
                                )}{" "}
                                {item.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Footer */}
                <footer className="mt-8 flex flex-col gap-2 border-t border-stone-200 pt-5 text-xs text-stone-400 sm:flex-row sm:justify-between">
                  <p>RabbitFarm Manager · Farm management made simpler.</p>
                  <p>
                    Dashboard figures reflect records currently stored in the database.
                  </p>
                </footer>
              </>
            ) : (
              !error && (
                <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
                  No dashboard data is available yet.
                </div>
              )
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
