
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import {
  getRabbits,
  getBreedings,
  createBreeding,
  updateBreeding,
  deleteBreeding,
  type Rabbit,
  type Breeding,
  type BreedingInput,
  type BreedingStatus,
  type PregnancyStatus,
} from "@/lib/api";

const BREEDING_STATUSES: { value: BreedingStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "mated", label: "Mated" },
  { value: "pregnant", label: "Pregnant" },
  { value: "kindled", label: "Kindled" },
  { value: "unsuccessful", label: "Unsuccessful" },
  { value: "cancelled", label: "Cancelled" },
];

const PREGNANCY_STATUSES: { value: PregnancyStatus; label: string }[] = [
  { value: "unknown", label: "Unknown" },
  { value: "suspected", label: "Suspected" },
  { value: "confirmed", label: "Confirmed" },
  { value: "not_pregnant", label: "Not pregnant" },
];

type FormValues = {
  male_rabbit_id: string;
  female_rabbit_id: string;
  mating_date: string;
  expected_kindling_date: string;
  actual_kindling_date: string;
  pregnancy_status: PregnancyStatus;
  status: BreedingStatus;
  notes: string;
};

const EMPTY_FORM: FormValues = {
  male_rabbit_id: "",
  female_rabbit_id: "",
  mating_date: new Date().toISOString().slice(0, 10),
  expected_kindling_date: "",
  actual_kindling_date: "",
  pregnancy_status: "unknown",
  status: "planned",
  notes: "",
};

function datePlusDays(date: string, days: number): string {
  if (!date) return "";

  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);

  const year = result.getFullYear();
  const month = String(result.getMonth() + 1).padStart(2, "0");
  const day = String(result.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "—";

  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function rabbitLabel(rabbit?: Rabbit): string {
  if (!rabbit) return "Unknown rabbit";

  const name = rabbit.name?.trim();
  const code = rabbit.rabbit_code?.trim();

  if (name && code) return `${name} (${code})`;
  return name || code || `Rabbit #${rabbit.id}`;
}

function statusLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClass(status: string): string {
  switch (status) {
    case "pregnant":
    case "confirmed":
    case "kindled":
      return "bg-emerald-100 text-emerald-800";
    case "unsuccessful":
    case "cancelled":
    case "not_pregnant":
      return "bg-rose-100 text-rose-700";
    case "mated":
    case "suspected":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-stone-100 text-stone-700";
  }
}

export default function BreedingsPage() {
  const [breedings, setBreedings] = useState<Breeding[]>([]);
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);

  const [statusFilter, setStatusFilter] = useState("");
  const [pregnancyFilter, setPregnancyFilter] = useState("");

  const males = rabbits.filter((rabbit) => rabbit.sex === "male");
  const females = rabbits.filter((rabbit) => rabbit.sex === "female");

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [breedingResult, rabbitResult] = await Promise.all([
        getBreedings(page),
        getRabbits("", 1),
      ]);

      setBreedings(breedingResult.data);
      setLastPage(breedingResult.last_page);
      setTotal(breedingResult.total);

      setRabbits(rabbitResult.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load breeding data."
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const filteredBreedings = breedings.filter((breeding) => {
    const matchesStatus =
      !statusFilter || breeding.status === statusFilter;
    const matchesPregnancy =
      !pregnancyFilter || breeding.pregnancy_status === pregnancyFilter;

    return matchesStatus && matchesPregnancy;
  });

  function openCreateForm() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      mating_date: new Date().toISOString().slice(0, 10),
    });
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  function openEditForm(breeding: Breeding) {
    setEditingId(breeding.id);
    setForm({
      male_rabbit_id: String(breeding.male_rabbit_id),
      female_rabbit_id: String(breeding.female_rabbit_id),
      mating_date: breeding.mating_date?.slice(0, 10) ?? "",
      expected_kindling_date:
        breeding.expected_kindling_date?.slice(0, 10) ?? "",
      actual_kindling_date:
        breeding.actual_kindling_date?.slice(0, 10) ?? "",
      pregnancy_status: breeding.pregnancy_status,
      status: breeding.status,
      notes: breeding.notes ?? "",
    });
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function updateForm<K extends keyof FormValues>(
    key: K,
    value: FormValues[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.male_rabbit_id || !form.female_rabbit_id) {
      setError("Select both a male rabbit and a female rabbit.");
      return;
    }

    if (form.male_rabbit_id === form.female_rabbit_id) {
      setError("A rabbit cannot be paired with itself.");
      return;
    }

    if (!form.mating_date) {
      setError("The mating date is required.");
      return;
    }

    if (
      form.expected_kindling_date &&
      form.expected_kindling_date < form.mating_date
    ) {
      setError("Expected kindling date cannot be before the mating date.");
      return;
    }

    if (
      form.actual_kindling_date &&
      form.actual_kindling_date < form.mating_date
    ) {
      setError("Actual kindling date cannot be before the mating date.");
      return;
    }

    const payload: BreedingInput = {
      male_rabbit_id: Number(form.male_rabbit_id),
      female_rabbit_id: Number(form.female_rabbit_id),
      mating_date: form.mating_date,
      expected_kindling_date: form.expected_kindling_date || null,
      actual_kindling_date: form.actual_kindling_date || null,
      pregnancy_status: form.pregnancy_status,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await updateBreeding(editingId, payload);
        setSuccess("Breeding record updated successfully.");
      } else {
        await createBreeding(payload);
        setSuccess("Breeding record created successfully.");
      }

      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);

      // Refresh the list so the displayed data comes from Laravel.
      await loadPage();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save breeding record."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(breeding: Breeding) {
    const confirmed = window.confirm(
      `Delete the breeding record for ${rabbitLabel(breeding.female_rabbit)} ` +
        `mated on ${formatDate(breeding.mating_date)}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deleteBreeding(breeding.id);
      setSuccess("Breeding record deleted successfully.");

      // If the last row on a page was deleted, go back one page.
      if (breedings.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadPage();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete breeding record."
      );
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

  const labelClass = "block text-sm font-medium text-stone-700";

  return (
    <div className="min-h-screen bg-[#f8f9f6] text-stone-900">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        <div className="min-w-0 flex-1 lg:ml-64">
          <AppHeader />

          <main className="mx-auto max-w-[1500px] p-5 sm:p-8">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-emerald-700">
                  <CalendarDays size={17} />
                  <span>Farm operations</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Breeding Management
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-stone-500">
                  Track mating records, pregnancy status, and expected kindling
                  dates for your rabbit herd.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
              >
                <Plus size={18} />
                Register breeding
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
              >
                <AlertCircle className="mt-0.5 shrink-0" size={18} />
                <div className="min-w-0 whitespace-pre-line">{error}</div>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="ml-auto shrink-0 rounded-lg p-1 hover:bg-rose-100"
                  aria-label="Dismiss error"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {success && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <Check size={18} />
                <span>{success}</span>
                <button
                  type="button"
                  onClick={() => setSuccess("")}
                  className="ml-auto rounded-lg p-1 hover:bg-emerald-100"
                  aria-label="Dismiss success message"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">Total breeding records</p>
                <p className="mt-2 text-3xl font-bold">{total}</p>
                <p className="mt-1 text-xs text-stone-400">
                  Across all pages
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">Male rabbits available</p>
                <p className="mt-2 text-3xl font-bold">{males.length}</p>
                <p className="mt-1 text-xs text-stone-400">
                  Loaded from your rabbit registry
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">
                  Female rabbits available
                </p>
                <p className="mt-2 text-3xl font-bold">{females.length}</p>
                <p className="mt-1 text-xs text-stone-400">
                  Loaded from your rabbit registry
                </p>
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">Breeding records</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Records.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    aria-label="Filter by breeding status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">All breeding statuses</option>
                    {BREEDING_STATUSES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filter by pregnancy status"
                    value={pregnancyFilter}
                    onChange={(event) => setPregnancyFilter(event.target.value)}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">All pregnancy statuses</option>
                    {PREGNANCY_STATUSES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => void loadPage()}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={15}
                      className={loading ? "animate-spin" : ""}
                    />
                    Refresh
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-3 p-16 text-sm text-stone-500">
                  <LoaderCircle className="animate-spin" size={20} />
                  Loading breeding records…
                </div>
              ) : filteredBreedings.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-16 text-center">
                  <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                    <CalendarDays size={28} />
                  </div>
                  <h3 className="font-semibold">No breeding records found</h3>
                  <p className="mt-2 max-w-md text-sm text-stone-500">
                    Register a mating to begin tracking pregnancy and kindling.
                    If filters are active, try clearing them.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    <Plus size={17} />
                    Register first breeding
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-left text-sm">
                      <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                        <tr>
                          <th className="px-5 py-4 font-semibold">Male rabbit</th>
                          <th className="px-5 py-4 font-semibold">Female rabbit</th>
                          <th className="px-5 py-4 font-semibold">Mating date</th>
                          <th className="px-5 py-4 font-semibold">Expected kindling</th>
                          <th className="px-5 py-4 font-semibold">Pregnancy</th>
                          <th className="px-5 py-4 font-semibold">Status</th>
                          <th className="px-5 py-4 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredBreedings.map((breeding) => (
                          <tr key={breeding.id} className="hover:bg-stone-50/70">
                            <td className="px-5 py-4 font-medium">
                              {rabbitLabel(breeding.male_rabbit)}
                            </td>
                            <td className="px-5 py-4 font-medium">
                              {rabbitLabel(breeding.female_rabbit)}
                            </td>
                            <td className="px-5 py-4 text-stone-600">
                              {formatDate(breeding.mating_date)}
                            </td>
                            <td className="px-5 py-4 text-stone-600">
                              {formatDate(breeding.expected_kindling_date)}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(breeding.pregnancy_status)}`}>
                                {statusLabel(breeding.pregnancy_status)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(breeding.status)}`}>
                                {statusLabel(breeding.status)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditForm(breeding)}
                                  title="Edit breeding record"
                                  aria-label="Edit breeding record"
                                  className="rounded-lg border border-stone-200 p-2 text-stone-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(breeding)}
                                  title="Delete breeding record"
                                  aria-label="Delete breeding record"
                                  className="rounded-lg border border-stone-200 p-2 text-stone-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-stone-500">
                      Page {page} of {lastPage} · {total} total record
                      {total === 1 ? "" : "s"}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={page <= 1 || loading}
                        className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                        disabled={page >= lastPage || loading}
                        className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>

            {formOpen && (
              <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-950/40 p-4 py-8 sm:items-center">
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="breeding-form-title"
                  className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 sm:px-7">
                    <div>
                      <h2 id="breeding-form-title" className="text-lg font-bold">
                        {editingId === null ? "Register breeding" : "Edit breeding"}
                      </h2>
                      <p className="mt-1 text-sm text-stone-500">
                        Enter mating details and update the outcome as it becomes known.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeForm}
                      disabled={saving}
                      aria-label="Close form"
                      className="rounded-xl p-2 text-stone-500 hover:bg-stone-100"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-7">
                      <label className={labelClass}>
                        Male rabbit (sire) *
                        <select
                          required
                          value={form.male_rabbit_id}
                          onChange={(event) => updateForm("male_rabbit_id", event.target.value)}
                          className={inputClass}
                        >
                          <option value="">Select male rabbit</option>
                          {males.map((rabbit) => (
                            <option key={rabbit.id} value={rabbit.id}>
                              {rabbitLabel(rabbit)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={labelClass}>
                        Female rabbit (dam) *
                        <select
                          required
                          value={form.female_rabbit_id}
                          onChange={(event) => updateForm("female_rabbit_id", event.target.value)}
                          className={inputClass}
                        >
                          <option value="">Select female rabbit</option>
                          {females.map((rabbit) => (
                            <option key={rabbit.id} value={rabbit.id}>
                              {rabbitLabel(rabbit)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={labelClass}>
                        Mating date *
                        <input
                          required
                          type="date"
                          value={form.mating_date}
                          onChange={(event) => {
                            const matingDate = event.target.value;
                            setForm((current) => ({
                              ...current,
                              mating_date: matingDate,
                              expected_kindling_date:
                                !current.expected_kindling_date ||
                                current.expected_kindling_date < matingDate
                                  ? datePlusDays(matingDate, 31)
                                  : current.expected_kindling_date,
                            }));
                          }}
                          className={inputClass}
                        />
                      </label>

                      <label className={labelClass}>
                        Expected kindling date
                        <input
                          type="date"
                          min={form.mating_date}
                          value={form.expected_kindling_date}
                          onChange={(event) => updateForm("expected_kindling_date", event.target.value)}
                          className={inputClass}
                        />
                        <span className="mt-1 block text-xs font-normal text-stone-400">
                          Suggested estimate: 31 days after mating.
                        </span>
                      </label>

                      <label className={labelClass}>
                        Actual kindling date
                        <input
                          type="date"
                          min={form.mating_date}
                          value={form.actual_kindling_date}
                          onChange={(event) => updateForm("actual_kindling_date", event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className={labelClass}>
                        Pregnancy status
                        <select
                          value={form.pregnancy_status}
                          onChange={(event) => updateForm("pregnancy_status", event.target.value as PregnancyStatus)}
                          className={inputClass}
                        >
                          {PREGNANCY_STATUSES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={labelClass}>
                        Breeding status
                        <select
                          value={form.status}
                          onChange={(event) => updateForm("status", event.target.value as BreedingStatus)}
                          className={inputClass}
                        >
                          {BREEDING_STATUSES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={`${labelClass} sm:col-span-2`}>
                        Notes
                        <textarea
                          rows={4}
                          maxLength={5000}
                          value={form.notes}
                          onChange={(event) => updateForm("notes", event.target.value)}
                          placeholder="Optional observations, mating details, or follow-up notes…"
                          className={inputClass}
                        />
                      </label>

                      {error && (
                        <div className="sm:col-span-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                          <AlertCircle size={17} className="mt-0.5 shrink-0" />
                          <span className="whitespace-pre-line">{error}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-stone-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                      <button
                        type="button"
                        onClick={closeForm}
                        disabled={saving}
                        className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving || males.length === 0 || females.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? (
                          <LoaderCircle className="animate-spin" size={17} />
                        ) : (
                          <Check size={17} />
                        )}
                        {saving
                          ? "Saving…"
                          : editingId === null
                            ? "Save breeding"
                            : "Update breeding"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
