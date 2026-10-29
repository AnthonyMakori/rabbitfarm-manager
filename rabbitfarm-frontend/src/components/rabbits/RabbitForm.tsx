
"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ImagePlus,
  LoaderCircle,
  Save,
  X,
} from "lucide-react";

import {
  createRabbit,
  type RabbitInput,
  type RabbitCategory,
  type RabbitSex,
  type RabbitStatus,
  type AcquisitionSource,
} from "@/lib/api";

const categories: { value: RabbitCategory; label: string }[] = [
  { value: "breeding", label: "Breeding" },
  { value: "growing", label: "Growing" },
  { value: "kit", label: "Kit" },
];

const sexes: { value: RabbitSex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

const statuses: { value: RabbitStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "deceased", label: "Deceased" },
  { value: "culled", label: "Culled" },
  { value: "transferred", label: "Transferred" },
];

const acquisitionSources: {
  value: AcquisitionSource;
  label: string;
}[] = [
  { value: "born_on_farm", label: "Born on farm" },
  { value: "purchased", label: "Purchased" },
  { value: "transferred", label: "Transferred" },
];

const inputClass =
  "mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-green-600 focus:ring-2 focus:ring-green-100";

const labelClass = "text-sm font-medium text-stone-700";

export default function RabbitForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    breed: "",
    sex: "female" as RabbitSex,
    date_of_birth: "",
    weight_kg: "",
    category: "growing" as RabbitCategory,
    status: "active" as RabbitStatus,
    acquisition_source: "born_on_farm" as AcquisitionSource,
    acquisition_cost: "",
    acquired_at: "",
    exit_date: "",
    notes: "",
  });

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function updateField(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((current) => ({ ...current, [field]: value }));

    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setError("");
    setImage(file);

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImage(null);
    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    if (!form.breed.trim()) {
      setFieldErrors({ breed: "Breed is required." });
      return;
    }

    if (form.weight_kg && Number(form.weight_kg) < 0) {
      setFieldErrors({ weight_kg: "Weight cannot be negative." });
      return;
    }

    if (
      form.acquisition_cost &&
      Number(form.acquisition_cost) < 0
    ) {
      setFieldErrors({
        acquisition_cost: "Cost cannot be negative.",
      });
      return;
    }

    if (
      form.date_of_birth &&
      form.acquired_at &&
      form.acquired_at < form.date_of_birth
    ) {
      setFieldErrors({
        acquired_at: "Acquisition date cannot be before the date of birth.",
      });
      return;
    }

    if (
      form.exit_date &&
      form.acquired_at &&
      form.exit_date < form.acquired_at
    ) {
      setFieldErrors({
        exit_date: "Exit date cannot be before the acquisition date.",
      });
      return;
    }

    setSaving(true);

    try {
      const payload: RabbitInput = {
        name: form.name.trim() || null,
        breed: form.breed.trim(),
        sex: form.sex,
        date_of_birth: form.date_of_birth || null,
        weight_kg: form.weight_kg
          ? Number(form.weight_kg)
          : null,
        category: form.category,
        status: form.status,
        acquisition_source: form.acquisition_source,
        acquisition_cost: form.acquisition_cost
          ? Number(form.acquisition_cost)
          : null,
        acquired_at: form.acquired_at || null,
        exit_date: form.exit_date || null,
        notes: form.notes.trim() || null,
        image,
      };

      const createdRabbit = await createRabbit(payload);

      router.push(`/rabbits/${createdRabbit.id}`);
      router.refresh();
    } catch (err) {
      const apiError = err as Error & {
        errors?: Record<string, string[]>;
      };

      if (apiError.errors) {
        const mappedErrors: Record<string, string> = {};

        Object.entries(apiError.errors).forEach(([key, messages]) => {
          mappedErrors[key] = messages[0] ?? "Invalid value.";
        });

        setFieldErrors(mappedErrors);
        setError("Please correct the highlighted fields.");
      } else {
        setError(
          apiError.message || "Unable to register rabbit. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/rabbits"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition hover:text-green-700"
        >
          <ArrowLeft size={17} />
          Back to rabbits
        </Link>

        <p className="text-xs text-stone-500">
          Fields marked <span className="text-red-600">*</span> are required.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-stone-900">
            Basic information
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Enter the rabbit&apos;s identity and classification.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="name">
              Rabbit name
            </label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={inputClass}
              placeholder="e.g. Snowy"
              maxLength={100}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="breed">
              Breed <span className="text-red-600">*</span>
            </label>
            <input
              id="breed"
              required
              value={form.breed}
              onChange={(e) => updateField("breed", e.target.value)}
              className={inputClass}
              placeholder="e.g. New Zealand White"
              maxLength={100}
            />
            {fieldErrors.breed && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.breed}</p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="sex">
              Sex <span className="text-red-600">*</span>
            </label>
            <select
              id="sex"
              required
              value={form.sex}
              onChange={(e) =>
                updateField("sex", e.target.value as RabbitSex)
              }
              className={inputClass}
            >
              {sexes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="date_of_birth">
              Date of birth
            </label>
            <input
              id="date_of_birth"
              type="date"
              value={form.date_of_birth}
              onChange={(e) =>
                updateField("date_of_birth", e.target.value)
              }
              className={inputClass}
            />
            {fieldErrors.date_of_birth && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.date_of_birth}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="weight_kg">
              Weight (kg)
            </label>
            <input
              id="weight_kg"
              type="number"
              min="0"
              step="0.001"
              value={form.weight_kg}
              onChange={(e) => updateField("weight_kg", e.target.value)}
              className={inputClass}
              placeholder="e.g. 2.500"
            />
            {fieldErrors.weight_kg && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.weight_kg}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="category">
              Category <span className="text-red-600">*</span>
            </label>
            <select
              id="category"
              required
              value={form.category}
              onChange={(e) =>
                updateField("category", e.target.value as RabbitCategory)
              }
              className={inputClass}
            >
              {categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="status">
              Status
            </label>
            <select
              id="status"
              value={form.status}
              onChange={(e) =>
                updateField("status", e.target.value as RabbitStatus)
              }
              className={inputClass}
            >
              {statuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-stone-900">
            Acquisition information
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Record how and when the rabbit joined your farm.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="acquisition_source">
              Acquisition source <span className="text-red-600">*</span>
            </label>
            <select
              id="acquisition_source"
              required
              value={form.acquisition_source}
              onChange={(e) =>
                updateField(
                  "acquisition_source",
                  e.target.value as AcquisitionSource,
                )
              }
              className={inputClass}
            >
              {acquisitionSources.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="acquired_at">
              Acquisition date
            </label>
            <input
              id="acquired_at"
              type="date"
              value={form.acquired_at}
              onChange={(e) => updateField("acquired_at", e.target.value)}
              className={inputClass}
            />
            {fieldErrors.acquired_at && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.acquired_at}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="acquisition_cost">
              Acquisition cost
            </label>
            <input
              id="acquisition_cost"
              type="number"
              min="0"
              step="0.01"
              value={form.acquisition_cost}
              onChange={(e) =>
                updateField("acquisition_cost", e.target.value)
              }
              className={inputClass}
              placeholder="e.g. 1500"
            />
            {fieldErrors.acquisition_cost && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.acquisition_cost}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="exit_date">
              Exit date (if applicable)
            </label>
            <input
              id="exit_date"
              type="date"
              value={form.exit_date}
              onChange={(e) => updateField("exit_date", e.target.value)}
              className={inputClass}
            />
            {fieldErrors.exit_date && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.exit_date}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-stone-900">
            Rabbit photograph
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Upload a clear image to identify this rabbit. Maximum size: 5 MB.
          </p>
        </div>

        <input
          ref={fileInputRef}
          id="image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />

        {imagePreview ? (
          <div className="flex flex-wrap items-start gap-4">
            <img
              src={imagePreview}
              alt="Selected rabbit preview"
              className="h-40 w-40 rounded-xl border border-stone-200 object-cover"
            />
            <div className="space-y-3">
              <p className="max-w-sm break-all text-sm text-stone-600">
                {image?.name}
              </p>
              <button
                type="button"
                onClick={removeImage}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                <X size={16} />
                Remove photo
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 px-5 py-10 text-center transition hover:border-green-500 hover:bg-green-50/50"
          >
            <ImagePlus size={30} className="text-green-700" />
            <span className="mt-3 text-sm font-semibold text-stone-800">
              Choose a rabbit photograph
            </span>
            <span className="mt-1 text-xs text-stone-500">
              JPG, PNG, WEBP, or another supported image format
            </span>
          </button>
        )}
        {fieldErrors.image && (
          <p className="mt-2 text-xs text-red-600">{fieldErrors.image}</p>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-stone-900">
            Additional notes
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Add identifying details or other observations.
          </p>
        </div>

        <label className={labelClass} htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          className={inputClass}
          placeholder="Enter any additional information..."
        />
        {fieldErrors.notes && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.notes}</p>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/rabbits"
          className="inline-flex items-center justify-center rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <>
              <LoaderCircle size={18} className="animate-spin" />
              Registering rabbit...
            </>
          ) : (
            <>
              <Save size={18} />
              Register rabbit
            </>
          )}
        </button>
      </div>
    </form>
  );
}
