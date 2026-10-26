
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createRabbitEvent,
  getRabbitEvents,
  type RabbitEvent,
  type RabbitEventInput,
  type RabbitEventType,
} from "@/lib/api";

interface RabbitHistoryProps {
  rabbitId: number;
}

const eventTypes: { value: RabbitEventType; label: string }[] = [
  { value: "weight", label: "Weight measurement" },
  { value: "vaccination", label: "Vaccination" },
  { value: "medication", label: "Medication" },
  { value: "breeding", label: "Breeding" },
  { value: "birth", label: "Birth / litter" },
  { value: "illness", label: "Illness" },
  { value: "treatment", label: "Treatment" },
  { value: "sale", label: "Sale" },
  { value: "other", label: "Other" },
];

function today(): string {
  const date = new Date();
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );
  return localDate.toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: string | number | null): string | null {
  if (value === null || value === "") return null;

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function getEventLabel(type: RabbitEventType): string {
  return eventTypes.find((item) => item.value === type)?.label ?? type;
}

const emptyForm = (): RabbitEventInput => ({
  event_type: "weight",
  title: "",
  event_date: today(),
  description: "",
  weight_kg: null,
  cost: null,
  next_due_date: null,
});

export default function RabbitHistory({ rabbitId }: RabbitHistoryProps) {
  const [events, setEvents] = useState<RabbitEvent[]>([]);
  const [form, setForm] = useState<RabbitEventInput>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const loadEvents = useCallback(async (pageToLoad = 1) => {
    setLoading(true);
    setError("");

    try {
      const result = await getRabbitEvents(rabbitId, pageToLoad);
      setEvents(result.data);
      setPage(result.current_page);
      setLastPage(result.last_page);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load this rabbit's history."
      );
    } finally {
      setLoading(false);
    }
  }, [rabbitId]);

  useEffect(() => {
    void loadEvents(1);
  }, [loadEvents]);

  function updateField<K extends keyof RabbitEventInput>(
    field: K,
    value: RabbitEventInput[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload: RabbitEventInput = {
        ...form,
        description: form.description?.trim() || null,
        weight_kg:
          form.weight_kg === null || form.weight_kg === undefined
            ? null
            : Number(form.weight_kg),
        cost:
          form.cost === null || form.cost === undefined
            ? null
            : Number(form.cost),
        next_due_date: form.next_due_date || null,
      };

      await createRabbitEvent(rabbitId, payload);

      setForm(emptyForm());
      setSuccess("History event saved successfully.");
      await loadEvents(1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save the history event."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-900">
          Rabbit history
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Track health, growth, breeding, expenses, and other important events.
        </p>
      </div>

      {/* Event registration form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
      >
        <h3 className="text-lg font-semibold text-stone-800">
          Record a history event
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-stone-700">
            Event type *
            <select
              required
              value={form.event_type}
              onChange={(e) =>
                updateField("event_type", e.target.value as RabbitEventType)
              }
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5"
            >
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-stone-700">
            Event date *
            <input
              required
              type="date"
              value={form.event_date}
              onChange={(e) => updateField("event_date", e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5"
            />
          </label>

          <label className="block text-sm font-medium text-stone-700 sm:col-span-2">
            Title *
            <input
              required
              maxLength={150}
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g. First vaccination"
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5"
            />
          </label>

          <label className="block text-sm font-medium text-stone-700">
            Weight (kg)
            <input
              type="number"
              min="0.001"
              max="99999.999"
              step="0.001"
              value={form.weight_kg ?? ""}
              onChange={(e) =>
                updateField(
                  "weight_kg",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              placeholder="e.g. 2.500"
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5"
            />
          </label>

          <label className="block text-sm font-medium text-stone-700">
            Cost (KSh)
            <input
              type="number"
              min="0"
              max="9999999999.99"
              step="0.01"
              value={form.cost ?? ""}
              onChange={(e) =>
                updateField(
                  "cost",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              placeholder="e.g. 250"
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5"
            />
          </label>

          <label className="block text-sm font-medium text-stone-700">
            Next due date
            <input
              type="date"
              value={form.next_due_date ?? ""}
              onChange={(e) =>
                updateField("next_due_date", e.target.value || null)
              }
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5"
            />
          </label>

          <label className="block text-sm font-medium text-stone-700 sm:col-span-2">
            Description / notes
            <textarea
              rows={3}
              maxLength={5000}
              value={form.description ?? ""}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Add details about this event..."
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5"
            />
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-green-700 px-5 py-2.5 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving event..." : "Save history event"}
        </button>
      </form>

      {/* History timeline */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-stone-800">
            Event timeline
          </h3>
          <button
            type="button"
            onClick={() => void loadEvents(1)}
            disabled={loading}
            className="text-sm font-medium text-green-700 hover:text-green-900 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-stone-500">
            Loading rabbit history...
          </p>
        ) : events.length === 0 ? (
          <div className="rounded-xl bg-stone-50 px-4 py-8 text-center">
            <p className="font-medium text-stone-700">
              No history events yet
            </p>
            <p className="mt-1 text-sm text-stone-500">
              Use the form above to record this rabbit&apos;s first event.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {events.map((item, index) => (
              <article key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-green-600 ring-4 ring-green-50" />
                  {index !== events.length - 1 && (
                    <span className="mt-2 w-px flex-1 bg-stone-200" />
                  )}
                </div>

                <div className="min-w-0 flex-1 rounded-xl border border-stone-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
                        {getEventLabel(item.event_type)}
                      </span>
                      <h4 className="mt-1 font-semibold text-stone-900">
                        {item.title}
                      </h4>
                    </div>
                    <time className="text-sm text-stone-500">
                      {formatDate(item.event_date)}
                    </time>
                  </div>

                  {item.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
                    {item.weight_kg !== null && item.weight_kg !== "" && (
                      <span>
                        <strong className="text-stone-800">Weight:</strong>{" "}
                        {Number(item.weight_kg).toFixed(3)} kg
                      </span>
                    )}

                    {item.cost !== null && item.cost !== "" && (
                      <span>
                        <strong className="text-stone-800">Cost:</strong>{" "}
                        {formatMoney(item.cost)}
                      </span>
                    )}

                    {item.next_due_date && (
                      <span>
                        <strong className="text-stone-800">Next due:</strong>{" "}
                        {formatDate(item.next_due_date)}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && lastPage > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => void loadEvents(page - 1)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-stone-500">
              Page {page} of {lastPage}
            </span>
            <button
              type="button"
              disabled={page >= lastPage}
              onClick={() => void loadEvents(page + 1)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
