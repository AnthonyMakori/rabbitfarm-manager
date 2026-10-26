"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Rabbit as RabbitIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { getRabbits, type Rabbit } from "@/lib/api";

function formatCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-50 text-green-700",
    sold: "bg-blue-50 text-blue-700",
    deceased: "bg-red-50 text-red-700",
    culled: "bg-amber-50 text-amber-700",
    transferred: "bg-purple-50 text-purple-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] ?? "bg-stone-100 text-stone-600"
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

export default function RabbitRegistry() {
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRabbits = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getRabbits(search, page);

      setRabbits(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load rabbit records.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRabbits();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadRabbits]);

  return (
    <div className="space-y-6">
      {/* Registry toolbar */}
      <section className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Registered animals</p>
          <p className="mt-1 text-2xl font-bold text-stone-900">
            {total} rabbits
          </p>
        </div>

        <Link
          href="/rabbits/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
        >
          <Plus size={18} />
          Register rabbit
        </Link>
      </section>

      {/* Search */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by rabbit code, name, or breed..."
              aria-label="Search rabbits"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-green-600 focus:bg-white"
            />
          </div>

          <button
            type="button"
            onClick={() => void loadRabbits()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      {/* Records table */}
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-5 py-4">
          <h2 className="font-bold text-stone-900">Rabbit records</h2>
          <p className="mt-1 text-sm text-stone-500">
            Browse and search your registered rabbits.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p className="font-semibold">Could not load rabbits</p>
            <p className="mt-1 whitespace-pre-line">{error}</p>
            <p className="mt-2 text-xs">
              Check that Laravel is running and the API URL is correct.
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Rabbit</th>
                <th className="px-5 py-4 font-semibold">Breed</th>
                <th className="px-5 py-4 font-semibold">Sex</th>
                <th className="px-5 py-4 font-semibold">Category</th>
                <th className="px-5 py-4 font-semibold">Weight</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-stone-500">
                    Loading rabbit records...
                  </td>
                </tr>
              ) : error ? null : rabbits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <RabbitIcon
                      size={34}
                      className="mx-auto text-stone-300"
                    />

                    <p className="mt-3 font-semibold text-stone-700">
                      No rabbits found
                    </p>

                    <p className="mt-1 text-sm text-stone-500">
                      Register your first rabbit to get started.
                    </p>

                    {!search && (
                      <Link
                        href="/rabbits/new"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
                      >
                        <Plus size={16} />
                        Register a rabbit
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                rabbits.map((rabbit) => (
                  <tr
                    key={rabbit.id}
                    className="transition hover:bg-stone-50/70"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-stone-900">
                        {rabbit.name || "Unnamed rabbit"}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {rabbit.rabbit_code ?? `Record #${rabbit.id}`}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-stone-600">
                      {rabbit.breed}
                    </td>

                    <td className="px-5 py-4 capitalize text-stone-600">
                      {rabbit.sex}
                    </td>

                    <td className="px-5 py-4 text-stone-600">
                      {formatCategory(rabbit.category)}
                    </td>

                    <td className="px-5 py-4 text-stone-600">
                      {rabbit.weight_kg != null
                        ? `${rabbit.weight_kg} kg`
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={rabbit.status} />
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/rabbits/${rabbit.id}`}
                        className="font-semibold text-green-700 hover:text-green-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-stone-500">
            Page {page} of {lastPage} · {total} total records
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              type="button"
              disabled={loading || page >= lastPage}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}