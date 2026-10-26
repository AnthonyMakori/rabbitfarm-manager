
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import {
  assignRabbitToHousing,
  getHousingUnit,
  getHousingUnits,
  type HousingMovementReason,
  type HousingUnit,
} from "@/lib/housing-api";

type AssignedRabbit = {
  id: number;
  rabbit_code: string;
  name?: string | null;
};

type HousingTransferPanelProps = {
  unitId: number;
  onTransferred: () => void;
};

const movementReasons: {
  value: HousingMovementReason;
  label: string;
}[] = [
  { value: "health", label: "Health or isolation" },
  { value: "cleaning", label: "Cleaning or maintenance" },
  { value: "weaning", label: "Weaning" },
  { value: "other", label: "Other reason" },
];

export default function HousingTransferPanel({
  unitId,
  onTransferred,
}: HousingTransferPanelProps) {
  const [rabbits, setRabbits] = useState<AssignedRabbit[]>([]);
  const [destinations, setDestinations] = useState<HousingUnit[]>([]);
  const [rabbitId, setRabbitId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [reason, setReason] =
    useState<HousingMovementReason>("other");
  const [movedAt, setMovedAt] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const currentUnit = await getHousingUnit(unitId);

      // Load all housing-unit pages so the destination list is complete.
      const firstPage = await getHousingUnits({ page: 1 });
      const allUnits = [...firstPage.data];

      for (
        let page = 2;
        page <= firstPage.last_page;
        page += 1
      ) {
        const nextPage = await getHousingUnits({ page });
        allUnits.push(...nextPage.data);
      }

      // Only rabbits currently assigned to this unit can be transferred.
      setRabbits(
        (currentUnit.rabbits ?? []).map((rabbit) => ({
          id: rabbit.id,
          rabbit_code: rabbit.rabbit_code,
          name: rabbit.name,
        })),
      );

      // Do not offer the current unit or inactive destinations.
      setDestinations(
        allUnits.filter(
          (unit) =>
            unit.id !== unitId && unit.status === "active",
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load transfer information.",
      );
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleTransfer(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!rabbitId || !destinationId) {
      setError("Select a rabbit and a destination unit.");
      return;
    }

    const destination = destinations.find(
      (unit) => unit.id === Number(destinationId),
    );

    if (!destination) {
      setError("The selected destination unit is unavailable.");
      return;
    }

    // This is a preliminary UI check. The backend must also
    // enforce capacity and assignment rules.
    if (
      typeof destination.rabbits_count === "number" &&
      destination.rabbits_count >= destination.capacity
    ) {
      setError("The selected destination unit is at capacity.");
      return;
    }

    setSubmitting(true);

    try {
      await assignRabbitToHousing({
        rabbit_id: Number(rabbitId),
        to_housing_unit_id: Number(destinationId),
        reason,
        notes: notes.trim() || undefined,
        moved_at: movedAt || undefined,
      });

      setSuccess("Rabbit transferred successfully.");
      setRabbitId("");
      setDestinationId("");
      setReason("other");
      setMovedAt("");
      setNotes("");

      // Refresh the parent details page and the available rabbits.
      onTransferred();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The rabbit could not be transferred.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
          <ArrowRightLeft size={20} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Transfer a Rabbit
          </h2>
          <p className="text-sm text-gray-500">
            Move a rabbit from this unit to another housing unit.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
          <Loader2 size={18} className="animate-spin" />
          Loading transfer information...
        </div>
      ) : rabbits.length === 0 ? (
        <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          There are no rabbits assigned to this unit to transfer.
        </p>
      ) : destinations.length === 0 ? (
        <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          No other active housing units are available as destinations.
        </p>
      ) : (
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="transfer-rabbit"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Rabbit
              </label>

              <select
                id="transfer-rabbit"
                value={rabbitId}
                onChange={(event) => setRabbitId(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select a rabbit</option>
                {rabbits.map((rabbit) => (
                  <option key={rabbit.id} value={rabbit.id}>
                    {rabbit.rabbit_code}
                    {rabbit.name ? ` — ${rabbit.name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="transfer-destination"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Destination unit
              </label>

              <select
                id="transfer-destination"
                value={destinationId}
                onChange={(event) =>
                  setDestinationId(event.target.value)
                }
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select destination</option>
                {destinations.map((unit) => {
                  const full =
                    typeof unit.rabbits_count === "number" &&
                    unit.rabbits_count >= unit.capacity;

                  return (
                    <option
                      key={unit.id}
                      value={unit.id}
                      disabled={full}
                    >
                      {unit.unit_code}
                      {unit.name ? ` — ${unit.name}` : ""}
                      {" "}({unit.rabbits_count ?? 0}/{unit.capacity})
                      {full ? " — Full" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label
                htmlFor="transfer-reason"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Reason for transfer
              </label>

              <select
                id="transfer-reason"
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value as HousingMovementReason,
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {movementReasons.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="transfer-date"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Movement date
              </label>

              <input
                id="transfer-date"
                type="date"
                value={movedAt}
                onChange={(event) => setMovedAt(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="transfer-notes"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Notes (optional)
            </label>

            <textarea
              id="transfer-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Add details about this movement..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <ArrowRightLeft size={17} />
                Transfer Rabbit
              </>
            )}
          </button>
        </form>
      )}
    </section>
  );
}
