
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Home,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";

import {
  createHousingUnit,
  getHousingUnits,
  type HousingUnit,
  type HousingUnitInput,
  type HousingUnitStatus,
  type HousingUnitType,
} from "@/lib/housing-api";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";

const initialForm: HousingUnitInput = {
  unit_code: "",
  name: "",
  unit_type: "hutch",
  location: "",
  capacity: 4,
  length_cm: null,
  width_cm: null,
  height_cm: null,
  status: "active",
  notes: "",
};

const typeLabels: Record<HousingUnitType, string> = {
  hutch: "Hutch",
  cage: "Cage",
  pen: "Pen",
  colony: "Colony",
};

const statusLabels: Record<HousingUnitStatus, string> = {
  active: "Active",
  maintenance: "Maintenance",
  inactive: "Inactive",
};

function occupancy(unit: HousingUnit) {
  return unit.rabbits_count ?? unit.rabbits?.length ?? 0;
}

function statusStyle(status: HousingUnitStatus) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "maintenance":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-500/20";
  }
}

export default function HousingPage() {
  const [units, setUnits] = useState<HousingUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [unitType, setUnitType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<HousingUnitInput>(initialForm);

  const loadUnits = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getHousingUnits({
        search,
        unit_type: unitType as HousingUnitType | "",
        status: status as HousingUnitStatus | "",
        page,
        per_page: 10,
      });

      setUnits(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load housing units.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, unitType, status, page]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const activeCount = units.filter(
    (unit) => unit.status === "active",
  ).length;

  const maintenanceCount = units.filter(
    (unit) => unit.status === "maintenance",
  ).length;

  const occupiedCount = units.reduce(
    (sum, unit) => sum + occupancy(unit),
    0,
  );

  const capacityCount = units.reduce(
    (sum, unit) => sum + Number(unit.capacity),
    0,
  );

  function updateForm<K extends keyof HousingUnitInput>(
    key: K,
    value: HousingUnitInput[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleCreate(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setFormError("");
    setNotice("");

    try {
      await createHousingUnit({
        ...form,
        unit_code: form.unit_code.trim(),
        name: form.name?.trim() || null,
        location: form.location?.trim() || null,
        notes: form.notes?.trim() || null,
      });

      setForm(initialForm);
      setShowCreateForm(false);
      setPage(1);
      setNotice("Housing unit created successfully.");

      // Reload the registry after creating a unit.
      // The page state will determine the requested results.
      await loadUnits();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Could not create housing unit.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9f6] text-stone-900">
      {/* Application layout: sidebar and main content */}
      <div className="flex min-h-screen">
        {/* Keep the desktop sidebar separate from the page content */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        {/* Main application content */}
        <div className="min-w-0 flex-1 lg:ml-64">
          {/* Shared application header */}
          <AppHeader />

          {/* Housing page content */}
          <main className="mx-auto max-w-[1400px] p-5 sm:p-8">
            {/* Page title and actions */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                  <Home className="h-4 w-4" />
                  <span>Farm Management</span>
                  <span>/</span>
                  <span>Housing</span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Housing Management
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Manage housing units, capacity, occupants, and rabbit
                  locations.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void loadUnits()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForm(initialForm);
                    setFormError("");
                    setShowCreateForm(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  <Plus className="h-4 w-4" />
                  Add housing unit
                </button>
              </div>
            </div>

            {/* Success notification */}
            {notice && (
              <div
                role="status"
                className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{notice}</span>

                <button
                  type="button"
                  className="ml-auto"
                  onClick={() => setNotice("")}
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* API error notification */}
            {error && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    Unable to load housing units
                  </p>

                  <p className="mt-1 break-words">{error}</p>

                  <p className="mt-2 text-red-700">
                    Check that the Laravel backend is running and the API
                    URL is correct.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadUnits()}
                  className="shrink-0 font-semibold underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Housing summary cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Housing units"
                value={total}
                subtitle="Registered units"
                icon={<Building2 className="h-5 w-5" />}
                iconClass="bg-blue-50 text-blue-700"
              />

              <SummaryCard
                title="Active on this page"
                value={activeCount}
                subtitle="Units ready for occupancy"
                icon={<CheckCircle2 className="h-5 w-5" />}
                iconClass="bg-emerald-50 text-emerald-700"
              />

              <SummaryCard
                title="Occupied capacity"
                value={`${occupiedCount} / ${capacityCount}`}
                subtitle="Rabbits and capacity on this page"
                icon={<Users className="h-5 w-5" />}
                iconClass="bg-violet-50 text-violet-700"
              />

              <SummaryCard
                title="Under maintenance"
                value={maintenanceCount}
                subtitle="Units needing attention"
                icon={<Activity className="h-5 w-5" />}
                iconClass="bg-amber-50 text-amber-700"
              />
            </div>

            {/* Search and filters */}
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search code, name, or location..."
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    aria-label="Search housing units"
                  />
                </div>

                <select
                  value={unitType}
                  onChange={(event) => {
                    setUnitType(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                  aria-label="Filter by housing type"
                >
                  <option value="">All unit types</option>
                  <option value="hutch">Hutch</option>
                  <option value="cage">Cage</option>
                  <option value="pen">Pen</option>
                  <option value="colony">Colony</option>
                </select>

                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Housing registry */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Housing registry
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Select a unit to view its rabbits and full details.
                  </p>
                </div>

                <span className="text-sm text-slate-500">
                  {total} {total === 1 ? "unit" : "units"}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading housing units...
                </div>
              ) : units.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Building2 className="h-6 w-6" />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-900">
                    No housing units found
                  </h3>

                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                    Create your first hutch, cage, pen, or colony, or adjust
                    your search filters.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setForm(initialForm);
                      setFormError("");
                      setShowCreateForm(true);
                    }}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    <Plus className="h-4 w-4" />
                    Add first unit
                  </button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100">
                    {units.map((unit) => {
                      const currentOccupancy = occupancy(unit);

                      const percentage =
                        Number(unit.capacity) > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (currentOccupancy /
                                  Number(unit.capacity)) *
                                  100,
                              ),
                            )
                          : 0;

                      const full =
                        currentOccupancy >= Number(unit.capacity);

                      return (
                        <div
                          key={unit.id}
                          className="p-4 transition hover:bg-slate-50/70 sm:p-5"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                            {/* Unit identity and location */}
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                                <Building2 className="h-5 w-5" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`/housing/${unit.id}`}
                                    className="font-semibold text-slate-900 hover:text-emerald-700"
                                  >
                                    {unit.unit_code}
                                  </Link>

                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyle(unit.status)}`}
                                  >
                                    {statusLabels[unit.status]}
                                  </span>
                                </div>

                                <p className="mt-1 text-sm text-slate-500">
                                  {unit.name || typeLabels[unit.unit_type]}
                                </p>

                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                  <span>
                                    {typeLabels[unit.unit_type]}
                                  </span>

                                  {unit.location && (
                                    <span className="inline-flex items-center gap-1">
                                      <MapPin className="h-3.5 w-3.5" />
                                      {unit.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Occupancy indicator */}
                            <div className="w-full xl:max-w-xs">
                              <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="text-slate-600">
                                  Occupancy
                                </span>

                                <span
                                  className={`font-semibold ${full ? "text-amber-700" : "text-slate-900"}`}
                                >
                                  {currentOccupancy} / {unit.capacity} rabbits
                                </span>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full transition-all ${full ? "bg-amber-500" : "bg-emerald-600"}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>

                              <p className="mt-1.5 text-xs text-slate-500">
                                {full
                                  ? "At capacity"
                                  : `${Number(unit.capacity) - currentOccupancy} spaces available`}
                              </p>
                            </div>

                            {/* Open unit details */}
                            <Link
                              href={`/housing/${unit.id}`}
                              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                            >
                              View details
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                      Page {page} of {lastPage}
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1 || loading}
                        onClick={() =>
                          setPage((current) => current - 1)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>

                      <button
                        type="button"
                        disabled={page >= lastPage || loading}
                        onClick={() =>
                          setPage((current) => current + 1)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Create housing unit modal */}
            {showCreateForm && (
              <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="create-housing-title"
                  className="my-4 w-full max-w-2xl rounded-2xl bg-white shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                    <div>
                      <h2
                        id="create-housing-title"
                        className="text-lg font-semibold text-slate-900"
                      >
                        Add housing unit
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Register a new hutch, cage, pen, or colony.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                      aria-label="Close form"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form
                    onSubmit={handleCreate}
                    className="space-y-5 p-5 sm:p-6"
                  >
                    {formError && (
                      <div
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                      >
                        {formError}
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Unit code *">
                        <input
                          required
                          maxLength={50}
                          value={form.unit_code}
                          onChange={(event) =>
                            updateForm("unit_code", event.target.value)
                          }
                          placeholder="e.g. HUT-001"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Display name">
                        <input
                          maxLength={120}
                          value={form.name ?? ""}
                          onChange={(event) =>
                            updateForm("name", event.target.value)
                          }
                          placeholder="e.g. Breeding Hutch A"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Unit type *">
                        <select
                          required
                          value={form.unit_type}
                          onChange={(event) =>
                            updateForm(
                              "unit_type",
                              event.target.value as HousingUnitType,
                            )
                          }
                          className={inputClass}
                        >
                          <option value="hutch">Hutch</option>
                          <option value="cage">Cage</option>
                          <option value="pen">Pen</option>
                          <option value="colony">Colony</option>
                        </select>
                      </Field>

                      <Field label="Capacity (rabbits) *">
                        <input
                          required
                          type="number"
                          min={1}
                          max={65535}
                          value={form.capacity}
                          onChange={(event) =>
                            updateForm(
                              "capacity",
                              Number(event.target.value),
                            )
                          }
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Location">
                        <input
                          maxLength={150}
                          value={form.location ?? ""}
                          onChange={(event) =>
                            updateForm("location", event.target.value)
                          }
                          placeholder="e.g. East Wing, Row A"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Initial status">
                        <select
                          value={form.status}
                          onChange={(event) =>
                            updateForm(
                              "status",
                              event.target.value as HousingUnitStatus,
                            )
                          }
                          className={inputClass}
                        >
                          <option value="active">Active</option>
                          <option value="maintenance">
                            Maintenance
                          </option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </Field>

                      <Field label="Length (cm)">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={form.length_cm ?? ""}
                          onChange={(event) =>
                            updateForm(
                              "length_cm",
                              event.target.value
                                ? Number(event.target.value)
                                : null,
                            )
                          }
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Width (cm)">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={form.width_cm ?? ""}
                          onChange={(event) =>
                            updateForm(
                              "width_cm",
                              event.target.value
                                ? Number(event.target.value)
                                : null,
                            )
                          }
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Height (cm)">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={form.height_cm ?? ""}
                          onChange={(event) =>
                            updateForm(
                              "height_cm",
                              event.target.value
                                ? Number(event.target.value)
                                : null,
                            )
                          }
                          className={inputClass}
                        />
                      </Field>

                      <div className="sm:col-span-2">
                        <Field label="Notes">
                          <textarea
                            rows={3}
                            maxLength={5000}
                            value={form.notes ?? ""}
                            onChange={(event) =>
                              updateForm("notes", event.target.value)
                            }
                            placeholder="Construction details, maintenance notes, or other information..."
                            className={inputClass}
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                      >
                        {saving && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}

                        {saving
                          ? "Saving..."
                          : "Create housing unit"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
