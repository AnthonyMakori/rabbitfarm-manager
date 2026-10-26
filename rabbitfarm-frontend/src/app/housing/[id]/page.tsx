
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  RefreshCw,
  Ruler,
  Users,
  Pencil,
} from "lucide-react";

import {
  getHousingUnit,
  type HousingUnit,
  type HousingUnitStatus,
  type HousingUnitType,
} from "@/lib/housing-api";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import HousingAssignmentPanel from "@/components/housing/HousingAssignmentPanel";
import HousingTransferPanel from "@/components/housing/HousingTransferPanel";

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

function getStatusClass(status: HousingUnitStatus) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "maintenance":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-500/20";
  }
}

function formatDimension(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not recorded";
  }

  return `${value} cm`;
}

function getOccupancy(unit: HousingUnit) {
  return Number(unit.rabbits_count ?? unit.rabbits?.length ?? 0);
}

export default function HousingUnitDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [unit, setUnit] = useState<HousingUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUnit = useCallback(async () => {
    if (!Number.isInteger(id) || id < 1) {
      setError("Invalid housing unit ID.");
      setUnit(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getHousingUnit(id);
      setUnit(result);
    } catch (err) {
      setUnit(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load housing unit details.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadUnit();
  }, [loadUnit]);

  const occupied = unit ? getOccupancy(unit) : 0;
  const capacity = unit ? Number(unit.capacity) : 0;

  const occupancyPercentage =
    capacity > 0
      ? Math.min(100, Math.round((occupied / capacity) * 100))
      : 0;

  return (
    <div className="min-h-screen bg-[#f8f9f6] text-stone-900">
      <div className="flex min-h-screen">
        {/* Shared application sidebar */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        {/* Main content area */}
        <div className="min-w-0 flex-1 lg:ml-64">
          <AppHeader />

          <main className="mx-auto max-w-[1400px] p-5 sm:p-8">
            {/* Back navigation */}
            <Link
              href="/housing"
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to housing registry
            </Link>

            {/* Loading state */}
            {loading ? (
              <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading housing unit details...
              </div>
            ) : error || !unit ? (
              /* Error state */
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <div className="min-w-0 flex-1">
                    <h1 className="font-semibold">
                      Unable to load housing unit
                    </h1>

                    <p className="mt-2 break-words text-sm">
                      {error || "The requested housing unit was not found."}
                    </p>

                    <button
                      type="button"
                      onClick={() => void loadUnit()}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium hover:bg-red-100"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Page heading */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                      <Building2 className="h-4 w-4" />
                      <span>Housing Management</span>
                      <span>/</span>
                      <span>Unit details</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="break-words text-3xl font-bold tracking-tight text-slate-900">
                        {unit.unit_code}
                      </h1>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClass(unit.status)}`}
                      >
                        {statusLabels[unit.status]}
                      </span>
                    </div>

                    <p className="mt-2 text-slate-500">
                      {unit.name || typeLabels[unit.unit_type]}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3">

                    {/* Edit housing unit */}
                    <Link
                        href={`/housing/${unit.id}/edit`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                        <Pencil className="h-4 w-4" />
                        Edit Unit
                    </Link>

                    {/* Refresh housing unit details */}
                    <button
                        type="button"
                        onClick={() => void loadUnit()}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh details
                    </button>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <SummaryCard
                    title="Housing type"
                    value={typeLabels[unit.unit_type]}
                    subtitle="Registered unit type"
                    icon={<Building2 className="h-5 w-5" />}
                    iconClass="bg-blue-50 text-blue-700"
                  />

                  <SummaryCard
                    title="Current occupancy"
                    value={`${occupied} / ${capacity}`}
                    subtitle="Rabbits compared with capacity"
                    icon={<Users className="h-5 w-5" />}
                    iconClass="bg-emerald-50 text-emerald-700"
                  />

                  <SummaryCard
                    title="Available spaces"
                    value={Math.max(0, capacity - occupied)}
                    subtitle={
                      occupied >= capacity
                        ? "This unit is at capacity"
                        : "Remaining capacity"
                    }
                    icon={<Activity className="h-5 w-5" />}
                    iconClass="bg-violet-50 text-violet-700"
                  />
                </div>

                {/* Occupancy progress */}
                <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-slate-900">
                      Occupancy overview
                    </h2>

                    <span className="text-sm font-semibold text-slate-700">
                      {occupancyPercentage}% occupied
                    </span>
                  </div>

                  <div
                    className="h-3 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label="Housing unit occupancy"
                    aria-valuenow={occupancyPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        occupied >= capacity
                          ? "bg-amber-500"
                          : "bg-emerald-600"
                      }`}
                      style={{ width: `${occupancyPercentage}%` }}
                    />
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    {occupied} {occupied === 1 ? "rabbit" : "rabbits"} currently
                    assigned out of {capacity} spaces.
                  </p>
                </section>

                {/* Unit information and dimensions */}
                <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-emerald-700" />

                      <h2 className="text-lg font-semibold text-slate-900">
                        Unit information
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Detail
                        label="Unit code"
                        value={unit.unit_code}
                      />

                      <Detail
                        label="Display name"
                        value={unit.name || "Not provided"}
                      />

                      <Detail
                        label="Unit type"
                        value={typeLabels[unit.unit_type]}
                      />

                      <Detail
                        label="Status"
                        value={statusLabels[unit.status]}
                      />

                      <div className="sm:col-span-2">
                        <Detail
                          label="Location"
                          value={unit.location || "Not recorded"}
                          icon={<MapPin className="h-4 w-4" />}
                        />
                      </div>

                      <Detail
                        label="Capacity"
                        value={`${capacity} rabbits`}
                      />

                      <Detail
                        label="Current occupancy"
                        value={`${occupied} rabbits`}
                      />
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center gap-2">
                      <Ruler className="h-5 w-5 text-emerald-700" />

                      <h2 className="text-lg font-semibold text-slate-900">
                        Dimensions
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Detail
                        label="Length"
                        value={formatDimension(unit.length_cm)}
                      />

                      <Detail
                        label="Width"
                        value={formatDimension(unit.width_cm)}
                      />

                      <Detail
                        label="Height"
                        value={formatDimension(unit.height_cm)}
                      />
                    </div>
                  </section>
                </div>

                {/* Rabbit housing assignment */}
                <HousingAssignmentPanel
                unitId={unit.id}
                onAssigned={() => void loadUnit()}
                />

                {/* Rabbit housing transfer */}
                <HousingTransferPanel
                unitId={unit.id}
                onTransferred={() => void loadUnit()}
                />

                {/* Assigned rabbits */}
                <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        Assigned rabbits
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Rabbits currently associated with this housing unit.
                      </p>
                    </div>

                    <span className="text-sm text-slate-500">
                      {unit.rabbits?.length ?? 0} listed
                    </span>
                  </div>

                  {!unit.rabbits || unit.rabbits.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <Users className="mx-auto h-8 w-8 text-slate-300" />

                      <h3 className="mt-3 font-semibold text-slate-800">
                        No rabbits listed
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        No rabbit records were included in this unit response.
                        The occupancy count above is based on the API response.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {unit.rabbits.map((rabbit) => (
                        <div
                          key={rabbit.id}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                              <Users className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {rabbit.name || "Unnamed rabbit"}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {rabbit.rabbit_code || `Rabbit #${rabbit.id}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                            {rabbit.breed && (
                              <span>Breed: {rabbit.breed}</span>
                            )}

                            {rabbit.sex && (
                              <span>Sex: {rabbit.sex}</span>
                            )}
                          </div>

                          <Link
                            href={`/rabbits/${rabbit.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            View rabbit
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Notes */}
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="mb-3 font-semibold text-slate-900">
                    Notes
                  </h2>

                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {unit.notes || "No additional notes recorded."}
                  </p>
                </section>

                {/* Future edit and movement actions will be added next. */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/housing"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to registry
                  </Link>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 flex items-center gap-2 break-words text-sm font-semibold text-slate-900">
        {icon}
        {value}
      </p>
    </div>
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
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
