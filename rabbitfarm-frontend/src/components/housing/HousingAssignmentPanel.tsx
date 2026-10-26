
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserPlus,
} from "lucide-react";

import {
  assignRabbitToHousing,
  type HousingMovementReason,
} from "@/lib/housing-api";

import {
  getRabbits,
  type Rabbit,
} from "@/lib/api";

interface HousingAssignmentPanelProps {
  unitId: number;
  onAssigned: () => void;
}

const reasonOptions: {
  value: HousingMovementReason;
  label: string;
}[] = [
  { value: "initial_assignment", label: "Initial assignment" },
  { value: "health", label: "Health reasons" },
  { value: "cleaning", label: "Cleaning" },
  { value: "weaning", label: "Weaning" },
  { value: "other", label: "Other" },
];

export default function HousingAssignmentPanel({
  unitId,
  onAssigned,
}: HousingAssignmentPanelProps) {
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [rabbitId, setRabbitId] = useState("");
  const [reason, setReason] =
    useState<HousingMovementReason>("initial_assignment");
  const [notes, setNotes] = useState("");
  const [movedAt, setMovedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRabbits = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch every page because the rabbit API returns 10 per page.
      const firstPage = await getRabbits("", 1);
      const allRabbits = [...firstPage.data];

      for (let page = 2; page <= firstPage.last_page; page++) {
        const result = await getRabbits("", page);
        allRabbits.push(...result.data);
      }

      // Only active rabbits with no housing assignment can be assigned.
      // Do not assume a missing housing_unit_id means unassigned.
      const eligibleRabbits = allRabbits.filter(
        (rabbit) =>
          rabbit.status === "active" &&
          rabbit.housing_unit_id === null,
      );

      setRabbits(eligibleRabbits);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load available rabbits.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRabbits();
  }, [loadRabbits]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!rabbitId) {
      setError("Please select a rabbit.");
      return;
    }

    setSaving(true);

    try {
      await assignRabbitToHousing({
        rabbit_id: Number(rabbitId),
        to_housing_unit_id: unitId,
        reason,
        notes: notes.trim() || undefined,
        moved_at: movedAt || undefined,
      });

      setSuccess("Rabbit assigned to this housing unit.");
      setRabbitId("");
      setReason("initial_assignment");
      setNotes("");
      setMovedAt("");

      // Refresh the parent unit details and available rabbit list.
      onAssigned();
      await loadRabbits();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to assign the rabbit.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <UserPlus className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Assign a rabbit
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Assign an available rabbit to this housing unit.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="whitespace-pre-line">{error}</p>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading available rabbits...
        </div>
      ) : rabbits.length === 0 ? (
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          No available rabbits were found. Check that your rabbit API returns
          each rabbit's `housing_unit_id` field and that there are active,
          unassigned rabbits.
          <button
            type="button"
            onClick={() => void loadRabbits()}
            className="ml-2 font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Try again
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="assignment-rabbit"
              className="text-sm font-medium text-slate-700"
            >
              Rabbit <span className="text-red-600">*</span>
            </label>

            <select
              id="assignment-rabbit"
              required
              value={rabbitId}
              onChange={(event) => setRabbitId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Select an unassigned rabbit</option>
              {rabbits.map((rabbit) => (
                <option key={rabbit.id} value={rabbit.id}>
                  {rabbit.rabbit_code || `Rabbit #${rabbit.id}`}
                  {rabbit.name ? ` — ${rabbit.name}` : ""}
                  {` (${rabbit.breed}, ${rabbit.sex})`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="assignment-reason"
                className="text-sm font-medium text-slate-700"
              >
                Reason
              </label>

              <select
                id="assignment-reason"
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value as HousingMovementReason)
                }
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {reasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="assignment-date"
                className="text-sm font-medium text-slate-700"
              >
                Movement date
              </label>

              <input
                id="assignment-date"
                type="date"
                value={movedAt}
                onChange={(event) => setMovedAt(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="assignment-notes"
              className="text-sm font-medium text-slate-700"
            >
              Notes
            </label>

            <textarea
              id="assignment-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional notes about this assignment..."
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !rabbitId}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Assign Rabbit
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
