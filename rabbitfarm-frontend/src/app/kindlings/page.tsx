
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
  getBreedings,
  getKindlings,
  createKindling,
  updateKindling,
  deleteKindling,
  type Breeding,
  type Kindling,
  type KindlingInput,
} from "@/lib/api";

type KindlingForm = {
  breeding_id: string;
  kindling_date: string;
  total_born: string;
  born_alive: string;
  stillborn: string;
  current_alive: string;
  weaned_count: string;
  weaning_date: string;
  notes: string;
};

const EMPTY_FORM: KindlingForm = {
  breeding_id: "",
  kindling_date: new Date().toISOString().slice(0, 10),
  total_born: "1",
  born_alive: "1",
  stillborn: "0",
  current_alive: "1",
  weaned_count: "0",
  weaning_date: "",
  notes: "",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function rabbitName(
  rabbit: Breeding["female_rabbit"] | Breeding["male_rabbit"]
): string {
  if (!rabbit) return "Unknown rabbit";

  const name = rabbit.name?.trim();
  const code = rabbit.rabbit_code?.trim();

  if (name && code) return `${name} (${code})`;
  return name || code || `Rabbit #${rabbit.id}`;
}

function breedingLabel(breeding: Breeding): string {
  return `${rabbitName(breeding.female_rabbit)} — mated ${formatDate(
    breeding.mating_date
  )}`;
}

export default function KindlingsPage() {
  const [kindlings, setKindlings] = useState<Kindling[]>([]);
  const [breedings, setBreedings] = useState<Breeding[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<KindlingForm>(EMPTY_FORM);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [kindlingResult, breedingResult] = await Promise.all([
        getKindlings(page),
        getBreedings(1),
      ]);

      setKindlings(kindlingResult.data);
      setLastPage(kindlingResult.last_page);
      setTotal(kindlingResult.total);
      setBreedings(breedingResult.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load kindling information."
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const existingBreedingIds = new Set(
    kindlings.map((kindling) => kindling.breeding_id)
  );

  const availableBreedings = breedings.filter(
    (breeding) =>
      !existingBreedingIds.has(breeding.id) ||
      breeding.id === Number(form.breeding_id)
  );

  const totalBorn = kindlings.reduce(
    (sum, item) => sum + Number(item.total_born),
    0
  );
  const totalAlive = kindlings.reduce(
    (sum, item) => sum + Number(item.current_alive ?? 0),
    0
  );
  const totalWeaned = kindlings.reduce(
    (sum, item) => sum + Number(item.weaned_count),
    0
  );

  function updateForm<K extends keyof KindlingForm>(
    key: K,
    value: KindlingForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  function openEditForm(item: Kindling) {
    setEditingId(item.id);
    setForm({
      breeding_id: String(item.breeding_id),
      kindling_date: item.kindling_date?.slice(0, 10) ?? "",
      total_born: String(item.total_born),
      born_alive: String(item.born_alive),
      stillborn: String(item.stillborn),
      current_alive:
        item.current_alive === null ? "" : String(item.current_alive),
      weaned_count: String(item.weaned_count),
      weaning_date: item.weaning_date?.slice(0, 10) ?? "",
      notes: item.notes ?? "",
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

  function handleBornAliveChange(value: string) {
    const alive = Number(value);
    const total = Number(form.total_born);
    const stillborn = Math.max(0, total - alive);

    setForm((current) => ({
      ...current,
      born_alive: value,
      stillborn: String(stillborn),
      current_alive:
        current.current_alive === "" ||
        Number(current.current_alive) > alive
          ? value
          : current.current_alive,
      weaned_count:
        Number(current.weaned_count) > alive ? "0" : current.weaned_count,
    }));
  }

  function handleTotalBornChange(value: string) {
    const total = Number(value);
    const alive = Math.min(Number(form.born_alive), total);
    const stillborn = Math.max(0, total - alive);

    setForm((current) => ({
      ...current,
      total_born: value,
      born_alive: String(alive),
      stillborn: String(stillborn),
      current_alive:
        current.current_alive === "" ||
        Number(current.current_alive) > alive
          ? String(alive)
          : current.current_alive,
      weaned_count:
        Number(current.weaned_count) > alive ? "0" : current.weaned_count,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const total = Number(form.total_born);
    const alive = Number(form.born_alive);
    const stillborn = Number(form.stillborn);
    const currentAlive =
      form.current_alive === "" ? null : Number(form.current_alive);
    const weaned = Number(form.weaned_count);

    if (!form.breeding_id && editingId === null) {
      setError("Select the breeding record associated with this birth.");
      return;
    }

    if (!form.kindling_date) {
      setError("The kindling date is required.");
      return;
    }

    if (total < 1 || alive < 0 || stillborn < 0 || alive + stillborn !== total) {
      setError("Total born must equal born alive plus stillborn.");
      return;
    }

    if (currentAlive !== null && (currentAlive < 0 || currentAlive > alive)) {
      setError("Current alive must be between zero and the born-alive count.");
      return;
    }

    if (weaned < 0 || weaned > (currentAlive ?? 0)) {
      setError("Weaned count cannot exceed the current alive count.");
      return;
    }

    if (
      form.weaning_date &&
      form.weaning_date < form.kindling_date
    ) {
      setError("Weaning date cannot be before the kindling date.");
      return;
    }

    const payload: KindlingInput = {
      kindling_date: form.kindling_date,
      total_born: total,
      born_alive: alive,
      stillborn,
      current_alive: currentAlive,
      weaned_count: weaned,
      weaning_date: form.weaning_date || null,
      notes: form.notes.trim() || null,
    };

    if (editingId === null) {
      payload.breeding_id = Number(form.breeding_id);
    }

    setSaving(true);

    try {
      if (editingId !== null) {
        await updateKindling(editingId, payload);
        setSuccess("Kindling record updated successfully.");
      } else {
        await createKindling(payload);
        setSuccess("Birth and litter record saved successfully.");
      }

      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadPage();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the kindling record."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Kindling) {
    const confirmed = window.confirm(
      `Delete the litter record for ${rabbitName(item.breeding?.female_rabbit)}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deleteKindling(item.id);
      setSuccess("Kindling record deleted successfully.");

      if (kindlings.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadPage();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete the kindling record."
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
                  Kindling &amp; Litter Management
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-stone-500">
                  Record births, monitor litter survival, and track weaning
                  progress.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
              >
                <Plus size={18} />
                Record a birth
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span className="min-w-0 whitespace-pre-line">{error}</span>
                <button
                  type="button"
                  onClick={() => setError("")}
                  aria-label="Dismiss error"
                  className="ml-auto"
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
                  aria-label="Dismiss success message"
                  className="ml-auto"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">Litter records</p>
                <p className="mt-2 text-3xl font-bold">{total}</p>
                <p className="mt-1 text-xs text-stone-400">All pages</p>
              </div>
              <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">Kits born</p>
                <p className="mt-2 text-3xl font-bold">{totalBorn}</p>
                <p className="mt-1 text-xs text-stone-400">Current page</p>
              </div>
              <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">Alive / weaned</p>
                <p className="mt-2 text-3xl font-bold">
                  {totalAlive} / {totalWeaned}
                </p>
                <p className="mt-1 text-xs text-stone-400">Current page</p>
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">Litter records</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Birth and litter information.
                  </p>
                </div>
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

              {loading ? (
                <div className="flex items-center justify-center gap-3 p-16 text-sm text-stone-500">
                  <LoaderCircle className="animate-spin" size={20} />
                  Loading litter records…
                </div>
              ) : kindlings.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-16 text-center">
                  <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                    <CalendarDays size={28} />
                  </div>
                  <h3 className="font-semibold">No litter records yet</h3>
                  <p className="mt-2 max-w-md text-sm text-stone-500">
                    Record a birth for a breeding that has not already been
                    linked to a kindling record.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    <Plus size={17} />
                    Record first birth
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-left text-sm">
                      <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                        <tr>
                          <th className="px-5 py-4 font-semibold">Mother</th>
                          <th className="px-5 py-4 font-semibold">Birth date</th>
                          <th className="px-5 py-4 font-semibold">Born</th>
                          <th className="px-5 py-4 font-semibold">Alive at birth</th>
                          <th className="px-5 py-4 font-semibold">Stillborn</th>
                          <th className="px-5 py-4 font-semibold">Currently alive</th>
                          <th className="px-5 py-4 font-semibold">Weaned</th>
                          <th className="px-5 py-4 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {kindlings.map((item) => (
                          <tr key={item.id} className="hover:bg-stone-50/70">
                            <td className="px-5 py-4 font-medium">
                              {rabbitName(item.breeding?.female_rabbit)}
                              <p className="mt-1 text-xs font-normal text-stone-400">
                                {rabbitName(item.breeding?.male_rabbit)}
                              </p>
                            </td>
                            <td className="px-5 py-4 text-stone-600">
                              {formatDate(item.kindling_date)}
                            </td>
                            <td className="px-5 py-4 font-semibold">{item.total_born}</td>
                            <td className="px-5 py-4">{item.born_alive}</td>
                            <td className="px-5 py-4">{item.stillborn}</td>
                            <td className="px-5 py-4">{item.current_alive ?? "—"}</td>
                            <td className="px-5 py-4">
                              <div className="font-medium">{item.weaned_count}</div>
                              {item.weaning_date && (
                                <p className="mt-1 text-xs text-stone-400">
                                  {formatDate(item.weaning_date)}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditForm(item)}
                                  title="Edit litter"
                                  aria-label="Edit litter record"
                                  className="rounded-lg border border-stone-200 p-2 text-stone-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(item)}
                                  title="Delete litter"
                                  aria-label="Delete litter record"
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
                      Page {page} of {lastPage} · {total} litter record
                      {total === 1 ? "" : "s"}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={page <= 1 || loading}
                        className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-3 py-2 text-sm disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                        disabled={page >= lastPage || loading}
                        className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-3 py-2 text-sm disabled:opacity-40"
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
                  aria-labelledby="kindling-form-title"
                  className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 sm:px-7">
                    <div>
                      <h2 id="kindling-form-title" className="text-lg font-bold">
                        {editingId === null ? "Record a birth" : "Edit litter record"}
                      </h2>
                      <p className="mt-1 text-sm text-stone-500">
                        Record birth counts and update litter progress.
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
                      {editingId === null ? (
                        <label className={`${labelClass} sm:col-span-2`}>
                          Breeding record *
                          <select
                            required
                            value={form.breeding_id}
                            onChange={(event) => updateForm("breeding_id", event.target.value)}
                            className={inputClass}
                          >
                            <option value="">Select breeding / mother</option>
                            {availableBreedings.map((breeding) => (
                              <option key={breeding.id} value={breeding.id}>
                                {breedingLabel(breeding)}
                              </option>
                            ))}
                          </select>
                          {availableBreedings.length === 0 && (
                            <span className="mt-1 block text-xs font-normal text-amber-700">
                              No eligible breeding records found on the first page.
                              Create a breeding record first, or check whether all
                              current records already have kindling entries.
                            </span>
                          )}
                        </label>
                      ) : (
                        <div className="sm:col-span-2 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
                          Breeding:{" "}
                          {kindlings.find((item) => item.id === editingId)?.breeding
                            ? breedingLabel(
                                kindlings.find((item) => item.id === editingId)!.breeding!
                              )
                            : `Record #${form.breeding_id}`}
                        </div>
                      )}

                      <label className={labelClass}>
                        Kindling / birth date *
                        <input
                          required
                          type="date"
                          value={form.kindling_date}
                          onChange={(event) => updateForm("kindling_date", event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className={labelClass}>
                        Total kits born *
                        <input
                          required
                          type="number"
                          min="1"
                          max="65535"
                          value={form.total_born}
                          onChange={(event) => handleTotalBornChange(event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className={labelClass}>
                        Born alive *
                        <input
                          required
                          type="number"
                          min="0"
                          max="65535"
                          value={form.born_alive}
                          onChange={(event) => handleBornAliveChange(event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className={labelClass}>
                        Stillborn *
                        <input
                          required
                          type="number"
                          min="0"
                          max="65535"
                          value={form.stillborn}
                          onChange={(event) => updateForm("stillborn", event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className={labelClass}>
                        Currently alive
                        <input
                          type="number"
                          min="0"
                          max={form.born_alive || "0"}
                          value={form.current_alive}
                          onChange={(event) => updateForm("current_alive", event.target.value)}
                          className={inputClass}
                        />
                        <span className="mt-1 block text-xs font-normal text-stone-400">
                          Leave blank if not yet counted.
                        </span>
                      </label>

                      <label className={labelClass}>
                        Kits weaned
                        <input
                          type="number"
                          min="0"
                          max={form.current_alive || "0"}
                          value={form.weaned_count}
                          onChange={(event) => updateForm("weaned_count", event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className={labelClass}>
                        Weaning date
                        <input
                          type="date"
                          min={form.kindling_date}
                          value={form.weaning_date}
                          onChange={(event) => updateForm("weaning_date", event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className={`${labelClass} sm:col-span-2`}>
                        Notes
                        <textarea
                          rows={4}
                          maxLength={5000}
                          value={form.notes}
                          onChange={(event) => updateForm("notes", event.target.value)}
                          placeholder="Birth observations, health concerns, or litter notes…"
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
                        disabled={
                          saving ||
                          (editingId === null && availableBreedings.length === 0)
                        }
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
                            ? "Save birth record"
                            : "Update litter"}
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
