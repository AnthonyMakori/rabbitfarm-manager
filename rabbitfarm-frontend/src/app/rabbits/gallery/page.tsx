"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ImageOff,
  LoaderCircle,
  Rabbit as RabbitIcon,
  Search,
  Venus,
  Mars,
  PawPrint,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import {
  getRabbits,
  getRabbitImageUrl,
  type Rabbit,
} from "@/lib/api";

function getRabbitAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return "Age unknown";

  const datePart = dateOfBirth.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);

  const birthDate = new Date(year, month - 1, day);
  const today = new Date();

  if (
    !Number.isFinite(birthDate.getTime()) ||
    birthDate.getTime() > today.getTime()
  ) {
    return "Age unknown";
  }

  let months =
    (today.getFullYear() - birthDate.getFullYear()) * 12 +
    today.getMonth() -
    birthDate.getMonth();

  if (today.getDate() < birthDate.getDate()) months--;

  if (months < 1) {
    const days = Math.floor(
      (new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).getTime() -
        new Date(year, month - 1, day).getTime()) /
        86_400_000,
    );

    return `${Math.max(0, days)} ${days === 1 ? "day" : "days"} old`;
  }

  if (months < 12) {
    return `${months} ${months === 1 ? "month" : "months"} old`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  return remainingMonths > 0
    ? `${years}y ${remainingMonths}m old`
    : `${years} ${years === 1 ? "year" : "years"} old`;
}

function formatCategory(category: string): string {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSex(sex: string): string {
  const normalized = sex.toLowerCase();

  if (normalized === "female") return "Female";
  if (normalized === "male") return "Male";
  return "Unknown";
}

function RabbitCard({ rabbit }: { rabbit: Rabbit }) {
  const imageUrl = getRabbitImageUrl(rabbit);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      href={`/rabbits/${rabbit.id}`}
      className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-green-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
    >
      {/* Large photograph */}
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={`Photograph of ${rabbit.name || rabbit.rabbit_code || "rabbit"}`}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-stone-400">
            {imageFailed ? (
              <ImageOff size={42} strokeWidth={1.4} />
            ) : (
              <RabbitIcon size={48} strokeWidth={1.3} />
            )}
            <span className="text-xs font-medium">
              {imageFailed ? "Photo unavailable" : "No photograph"}
            </span>
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur">
          {formatCategory(rabbit.category)}
        </span>

        <span
          className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
            rabbit.status === "active"
              ? "bg-green-100 text-green-800"
              : "bg-stone-100 text-stone-700"
          }`}
        >
          {formatCategory(rabbit.status)}
        </span>
      </div>

      {/* Rabbit information */}
      <div className="p-4">
        <h2 className="truncate text-lg font-bold text-stone-900 group-hover:text-green-800">
          {rabbit.name || "Unnamed rabbit"}
        </h2>

        <p className="mt-1 text-xs font-medium tracking-wide text-stone-400">
          {rabbit.rabbit_code || `Rabbit #${rabbit.id}`}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <CalendarDays
              size={17}
              className="mt-0.5 shrink-0 text-green-700"
            />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-stone-400">
                Age
              </p>
              <p className="mt-1 text-sm font-semibold text-stone-700">
                {getRabbitAge(rabbit.date_of_birth)}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-start gap-2">
            {rabbit.sex?.toLowerCase() === "female" ? (
              <Venus size={17} className="mt-0.5 shrink-0 text-pink-600" />
            ) : rabbit.sex?.toLowerCase() === "male" ? (
              <Mars size={17} className="mt-0.5 shrink-0 text-blue-600" />
            ) : (
              <PawPrint
                size={17}
                className="mt-0.5 shrink-0 text-stone-400"
              />
            )}
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-stone-400">
                Sex
              </p>
              <p className="mt-1 text-sm font-semibold text-stone-700">
                {formatSex(rabbit.sex)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
          <span className="truncate text-xs text-stone-500">
            {rabbit.breed || "Breed not recorded"}
          </span>
          <span className="shrink-0 text-xs font-semibold text-green-700">
            View profile →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function RabbitGalleryPage() {
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadFirstPage = useCallback(async (query: string) => {
    setLoading(true);
    setError("");
    setRabbits([]);
    setCurrentPage(1);
    setLastPage(1);
    setTotal(0);

    try {
      const result = await getRabbits(query, 1);

      // Show rabbits currently on the farm, not sold or transferred ones.
      setRabbits(result.data.filter((rabbit) => rabbit.status === "active"));
      setCurrentPage(result.current_page);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the rabbit gallery.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadFirstPage(search.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [search, loadFirstPage]);

  async function loadMore() {
    if (loadingMore || loading || currentPage >= lastPage) return;

    const nextPage = currentPage + 1;
    setLoadingMore(true);
    setError("");

    try {
      const result = await getRabbits(search.trim(), nextPage);

      setRabbits((previous) => {
        const existingIds = new Set(previous.map((rabbit) => rabbit.id));
        const newRabbits = result.data.filter(
          (rabbit) =>
            rabbit.status === "active" && !existingIds.has(rabbit.id),
        );

        return [...previous, ...newRabbits];
      });

      setCurrentPage(result.current_page);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load more rabbits.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9f6] text-stone-900">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        <div className="min-w-0 flex-1 lg:ml-64">
          <AppHeader />

          <main className="mx-auto max-w-[1600px] p-5 sm:p-8">
            {/* Page heading */}
            <Link
              href="/rabbits"
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-green-700"
            >
              <ArrowLeft size={16} />
              Back to rabbit registry
            </Link>

            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold tracking-wide text-green-700">
                  MEET YOUR RABBITS
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  Rabbit Gallery
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">
                  Browse your farm rabbits, see their photographs, and open
                  any card to view the full profile.
                </p>
              </div>

              <Link
                href="/rabbits/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
              >
                <RabbitIcon size={18} />
                Register rabbit
              </Link>
            </div>

            {/* Search and count */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or rabbit code..."
                  aria-label="Search rabbits"
                  className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-stone-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />
              </div>

              {!loading && (
                <p className="text-sm text-stone-500">
                  <span className="font-semibold text-stone-800">
                    {rabbits.length}
                  </span>{" "}
                  displayed · {total} registered in total
                </p>
              )}
            </div>

            {/* Errors */}
            {error && (
              <div
                role="alert"
                className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <AlertCircle size={19} />
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => void loadFirstPage(search.trim())}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 font-semibold hover:bg-red-100"
                >
                  <RefreshCw size={14} />
                  Retry
                </button>
              </div>
            )}

            {/* Initial loading */}
            {loading ? (
              <div className="mt-8 rounded-2xl border border-stone-200 bg-white py-20 text-center">
                <LoaderCircle
                  size={32}
                  className="mx-auto animate-spin text-green-700"
                />
                <p className="mt-4 text-sm font-medium text-stone-700">
                  Loading your rabbit gallery...
                </p>
              </div>
            ) : rabbits.length === 0 && !error ? (
              <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
                <RabbitIcon
                  size={48}
                  className="mx-auto text-stone-300"
                  strokeWidth={1.3}
                />
                <h2 className="mt-4 text-lg font-bold">
                  {search.trim()
                    ? "No matching rabbits found"
                    : "No active rabbits yet"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
                  {search.trim()
                    ? "Try a different name or identification code."
                    : "Register a rabbit to start building your farm gallery."}
                </p>
                {!search.trim() && (
                  <Link
                    href="/rabbits/new"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    <RabbitIcon size={17} />
                    Register your first rabbit
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Responsive, scrollable card gallery */}
                <section
                  aria-label="Rabbit gallery"
                  className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                >
                  {rabbits.map((rabbit) => (
                    <RabbitCard key={rabbit.id} rabbit={rabbit} />
                  ))}
                </section>

                {/* Pagination */}
                {currentPage < lastPage && (
                  <div className="mt-10 flex flex-col items-center gap-3">
                    <p className="text-xs text-stone-500">
                      More rabbits are available in the registry.
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadMore()}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-6 py-3 text-sm font-semibold text-stone-700 transition hover:border-green-300 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingMore ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <ChevronDown size={17} />
                      )}
                      {loadingMore ? "Loading rabbits..." : "Load more rabbits"}
                    </button>
                  </div>
                )}

                {currentPage >= lastPage && (
                  <p className="mt-10 text-center text-xs text-stone-400">
                    You have reached the end of the gallery.
                  </p>
                )}
              </>
            )}

            <footer className="mt-10 border-t border-stone-200 py-5 text-center text-xs text-stone-400">
              RabbitFarm Manager · Your farm, one rabbit at a time.
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
