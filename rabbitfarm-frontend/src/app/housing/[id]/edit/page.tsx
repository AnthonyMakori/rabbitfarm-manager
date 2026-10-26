"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";

import {
  getHousingUnit,
  updateHousingUnit,
  type HousingUnitInput,
  type HousingUnitType,
  type HousingUnitStatus,
} from "@/lib/housing-api";

// Form values are strings because HTML inputs return strings.
// We convert numeric values before sending them to Laravel.
interface HousingFormValues {
  unit_code: string;
  name: string;
  unit_type: HousingUnitType;
  location: string;
  capacity: string;
  length_cm: string;
  width_cm: string;
  height_cm: string;
  status: HousingUnitStatus;
  notes: string;
}

const initialFormValues: HousingFormValues = {
  unit_code: "",
  name: "",
  unit_type: "hutch",
  location: "",
  capacity: "1",
  length_cm: "",
  width_cm: "",
  height_cm: "",
  status: "active",
  notes: "",
};

const inputClassName =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const labelClassName = "text-sm font-medium text-slate-700";

export default function EditHousingUnitPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = Number(params.id);

  const [form, setForm] =
    useState<HousingFormValues>(initialFormValues);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load the existing unit so the form starts with its current values.
  useEffect(() => {
    let cancelled = false;

    async function loadUnit() {
      if (!Number.isInteger(id) || id < 1) {
        setError("Invalid housing unit ID.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const unit = await getHousingUnit(id);

        if (cancelled) return;

        setForm({
          unit_code: unit.unit_code ?? "",
          name: unit.name ?? "",
          unit_type: unit.unit_type,
          location: unit.location ?? "",
          capacity: String(unit.capacity ?? 1),
          length_cm:
            unit.length_cm == null ? "" : String(unit.length_cm),
          width_cm:
            unit.width_cm == null ? "" : String(unit.width_cm),
          height_cm:
            unit.height_cm == null ? "" : String(unit.height_cm),
          status: unit.status,
          notes: unit.notes ?? "",
        });
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the housing unit.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUnit();

    // Avoid updating state if the page unmounts during the request.
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Update one form field without changing the others.
  function updateField<K extends keyof HousingFormValues>(
    field: K,
    value: HousingFormValues[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  // Validate and submit the updated unit to Laravel.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!Number.isInteger(id) || id < 1) {
      setError("Invalid housing unit ID.");
      return;
    }

    const unitCode = form.unit_code.trim();
    const capacity = Number(form.capacity);

    if (!unitCode) {
      setError("Unit code is required.");
      return;
    }

    if (
      form.capacity.trim() === "" ||
      !Number.isInteger(capacity) ||
      capacity < 1
    ) {
      setError("Capacity must be a whole number greater than zero.");
      return;
    }

    // Optional dimensions must be valid, positive numbers when supplied.
    const dimensionFields = [
      { label: "Length", value: form.length_cm },
      { label: "Width", value: form.width_cm },
      { label: "Height", value: form.height_cm },
    ];

    for (const dimension of dimensionFields) {
      if (dimension.value.trim() === "") continue;

      const value = Number(dimension.value);

      if (!Number.isFinite(value) || value <= 0) {
        setError(
          `${dimension.label} must be greater than zero, or left blank.`,
        );
        return;
      }
    }

    const input: HousingUnitInput = {
      unit_code: unitCode,
      name: form.name.trim() || null,
      unit_type: form.unit_type,
      location: form.location.trim() || null,
      capacity,
      length_cm:
        form.length_cm.trim() === ""
          ? null
          : Number(form.length_cm),
      width_cm:
        form.width_cm.trim() === ""
          ? null
          : Number(form.width_cm),
      height_cm:
        form.height_cm.trim() === ""
          ? null
          : Number(form.height_cm),
      status: form.status,
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      // Uses the existing PUT /api/housing-units/{id} endpoint.
      await updateHousingUnit(id, input);

      setSuccess("Housing unit updated successfully.");

      // Return to the details page after a successful update.
      router.push(`/housing/${id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the housing unit.",
      );
    } finally {
      setSaving(false);
    }
  }

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

          <main className="mx-auto max-w-[1100px] p-5 sm:p-8">
            {/* Back navigation */}
            <Link
              href={`/housing/${id}`}
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to unit details
            </Link>

            {/* Page heading */}
            <div className="mb-8">
              <p className="text-sm font-medium text-emerald-700">
                Housing Management
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Edit Housing Unit
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Update the housing unit information and save your changes.
              </p>
            </div>

            {/* Loading state */}
            {loading ? (
              <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading housing unit...
              </div>
            ) : error && form.unit_code === "" ? (
              /* Initial loading or invalid ID error */
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <div>
                    <h2 className="font-semibold">
                      Unable to load housing unit
                    </h2>

                    <p className="mt-1 text-sm">{error}</p>

                    <Link
                      href="/housing"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium hover:bg-red-100"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Return to registry
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {/* Error message */}
                {error && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                  >
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                {/* Success message */}
                {success && (
                  <div
                    role="status"
                    className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{success}</p>
                  </div>
                )}

                {/* Basic information */}
                <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Basic information
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Identify the unit and describe where it is located.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="unit_code"
                        className={labelClassName}
                      >
                        Unit code <span className="text-red-600">*</span>
                      </label>

                      <input
                        id="unit_code"
                        name="unit_code"
                        type="text"
                        required
                        maxLength={255}
                        value={form.unit_code}
                        onChange={(event) =>
                          updateField("unit_code", event.target.value)
                        }
                        className={inputClassName}
                        placeholder="e.g. HUT-001"
                      />
                    </div>

                    <div>
                      <label htmlFor="name" className={labelClassName}>
                        Display name
                      </label>

                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={(event) =>
                          updateField("name", event.target.value)
                        }
                        className={inputClassName}
                        placeholder="e.g. Breeding Hutch A"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="unit_type"
                        className={labelClassName}
                      >
                        Housing type <span className="text-red-600">*</span>
                      </label>

                      <select
                        id="unit_type"
                        name="unit_type"
                        required
                        value={form.unit_type}
                        onChange={(event) =>
                          updateField(
                            "unit_type",
                            event.target.value as HousingUnitType,
                          )
                        }
                        className={inputClassName}
                      >
                        <option value="hutch">Hutch</option>
                        <option value="cage">Cage</option>
                        <option value="pen">Pen</option>
                        <option value="colony">Colony</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="location" className={labelClassName}>
                        Location
                      </label>

                      <input
                        id="location"
                        name="location"
                        type="text"
                        value={form.location}
                        onChange={(event) =>
                          updateField("location", event.target.value)
                        }
                        className={inputClassName}
                        placeholder="e.g. East Wing, Row 2"
                      />
                    </div>
                  </div>
                </section>

                {/* Capacity and dimensions */}
                <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Capacity and dimensions
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Enter the maximum number of rabbits and the unit
                      dimensions in centimetres.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="capacity"
                        className={labelClassName}
                      >
                        Capacity (rabbits){" "}
                        <span className="text-red-600">*</span>
                      </label>

                      <input
                        id="capacity"
                        name="capacity"
                        type="number"
                        required
                        min="1"
                        step="1"
                        value={form.capacity}
                        onChange={(event) =>
                          updateField("capacity", event.target.value)
                        }
                        className={inputClassName}
                      />

                      <p className="mt-1 text-xs text-slate-500">
                        Must be a whole number greater than zero.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="length_cm" className={labelClassName}>
                        Length (cm)
                      </label>

                      <input
                        id="length_cm"
                        name="length_cm"
                        type="number"
                        min="0.01"
                        step="any"
                        value={form.length_cm}
                        onChange={(event) =>
                          updateField("length_cm", event.target.value)
                        }
                        className={inputClassName}
                        placeholder="e.g. 120"
                      />
                    </div>

                    <div>
                      <label htmlFor="width_cm" className={labelClassName}>
                        Width (cm)
                      </label>

                      <input
                        id="width_cm"
                        name="width_cm"
                        type="number"
                        min="0.01"
                        step="any"
                        value={form.width_cm}
                        onChange={(event) =>
                          updateField("width_cm", event.target.value)
                        }
                        className={inputClassName}
                        placeholder="e.g. 80"
                      />
                    </div>

                    <div>
                      <label htmlFor="height_cm" className={labelClassName}>
                        Height (cm)
                      </label>

                      <input
                        id="height_cm"
                        name="height_cm"
                        type="number"
                        min="0.01"
                        step="any"
                        value={form.height_cm}
                        onChange={(event) =>
                          updateField("height_cm", event.target.value)
                        }
                        className={inputClassName}
                        placeholder="e.g. 60"
                      />
                    </div>
                  </div>
                </section>

                {/* Status and notes */}
                <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Status and notes
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Manage the unit's operational status and additional
                      information.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <label htmlFor="status" className={labelClassName}>
                        Unit status <span className="text-red-600">*</span>
                      </label>

                      <select
                        id="status"
                        name="status"
                        required
                        value={form.status}
                        onChange={(event) =>
                          updateField(
                            "status",
                            event.target.value as HousingUnitStatus,
                          )
                        }
                        className={inputClassName}
                      >
                        <option value="active">Active</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="notes" className={labelClassName}>
                        Notes
                      </label>

                      <textarea
                        id="notes"
                        name="notes"
                        rows={5}
                        value={form.notes}
                        onChange={(event) =>
                          updateField("notes", event.target.value)
                        }
                        className={inputClassName}
                        placeholder="Enter any additional information about this unit..."
                      />
                    </div>
                  </div>
                </section>

                {/* Form actions */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Link
                    href={`/housing/${id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving changes...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
