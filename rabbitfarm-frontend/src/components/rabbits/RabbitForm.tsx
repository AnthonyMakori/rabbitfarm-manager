"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, LoaderCircle, Rabbit } from "lucide-react";

import {
  createRabbit,
  type RabbitInput,
  type RabbitCategory,
  type RabbitSex,
  type AcquisitionSource,
} from "@/lib/api";

const inputClass =
  "mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100";

const labelClass = "text-sm font-semibold text-stone-700";

const initialForm = {
  name: "",
  breed: "",
  sex: "female" as RabbitSex,
  date_of_birth: "",
  weight_kg: "",
  category: "growing" as RabbitCategory,
  acquisition_source: "born_on_farm" as AcquisitionSource,
  acquisition_cost: "",
  acquired_at: "",
  notes: "",
};

export default function RabbitForm() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successCode, setSuccessCode] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function updateField<K extends keyof typeof initialForm>(
    field: K,
    value: (typeof initialForm)[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccessCode("");

    if (!form.breed.trim()) {
      setError("Please enter the rabbit's breed.");
      return;
    }

    setSubmitting(true);

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
        acquisition_source: form.acquisition_source,
        acquisition_cost:
          form.acquisition_cost !== ""
            ? Number(form.acquisition_cost)
            : null,
        acquired_at: form.acquired_at || null,
        notes: form.notes.trim() || null,
        image,
      };

      const rabbit = await createRabbit(payload);

      setSuccessCode(rabbit.rabbit_code ?? `Record #${rabbit.id}`);
      setForm(initialForm);
      setImage(null);
      setImagePreview(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while registering the rabbit.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/rabbits"
        className="mb-5 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-green-700"
      >
        <ArrowLeft size={16} />
        Back to rabbit registry
      </Link>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-100 bg-white p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <Rabbit size={25} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-stone-900">
                Rabbit details
              </h2>

              <p className="mt-1 text-sm text-stone-500">
                Enter the details of the rabbit you want to register.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-8 p-5 sm:p-7">
            {error && (
              <div
                role="alert"
                className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {successCode && (
              <div
                role="status"
                className="rounded-xl border border-green-200 bg-green-50 p-4"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={21}
                    className="mt-0.5 shrink-0 text-green-700"
                  />

                  <div>
                    <p className="font-semibold text-green-900">
                      Rabbit registered successfully!
                    </p>

                    <p className="mt-1 text-sm text-green-800">
                      Identification code: {successCode}
                    </p>

                    <Link
                      href="/rabbits"
                      className="mt-3 inline-block text-sm font-semibold text-green-800 underline underline-offset-4"
                    >
                      View rabbit registry
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Basic information */}
            <section>
              <h3 className="font-bold text-stone-900">
                Basic information
              </h3>

              <p className="mt-1 text-sm text-stone-500">
                Identify the rabbit and its physical characteristics.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className={labelClass}>
                    Rabbit name
                    <span className="ml-1 font-normal text-stone-400">
                      (optional)
                    </span>
                  </label>

                  <input
                    id="name"
                    type="text"
                    maxLength={100}
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    placeholder="e.g. Snowy"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="breed" className={labelClass}>
                    Breed <span className="text-red-600">*</span>
                  </label>

                  <input
                    id="breed"
                    type="text"
                    maxLength={100}
                    required
                    value={form.breed}
                    onChange={(event) =>
                      updateField("breed", event.target.value)
                    }
                    placeholder="e.g. New Zealand White"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="sex" className={labelClass}>
                    Sex <span className="text-red-600">*</span>
                  </label>

                  <select
                    id="sex"
                    value={form.sex}
                    onChange={(event) =>
                      updateField("sex", event.target.value as RabbitSex)
                    }
                    className={inputClass}
                  >
                    <option value="female">Female (Doe)</option>
                    <option value="male">Male (Buck)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="date_of_birth" className={labelClass}>
                    Date of birth
                  </label>

                  <input
                    id="date_of_birth"
                    type="date"
                    max={new Date().toLocaleDateString("en-CA")}
                    value={form.date_of_birth}
                    onChange={(event) =>
                      updateField("date_of_birth", event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="weight_kg" className={labelClass}>
                    Current weight (kg)
                  </label>

                  <input
                    id="weight_kg"
                    type="number"
                    min="0.001"
                    max="99999.999"
                    step="0.001"
                    value={form.weight_kg}
                    onChange={(event) =>
                      updateField("weight_kg", event.target.value)
                    }
                    placeholder="e.g. 2.500"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="category" className={labelClass}>
                    Production category
                  </label>

                  <select
                    id="category"
                    value={form.category}
                    onChange={(event) =>
                      updateField(
                        "category",
                        event.target.value as RabbitCategory,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="kit">Kit</option>
                    <option value="growing">Growing rabbit</option>
                    <option value="breeding">Breeding rabbit</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Acquisition information */}
            <section className="border-t border-stone-100 pt-7">
              <h3 className="font-bold text-stone-900">
                Acquisition information
              </h3>

              <p className="mt-1 text-sm text-stone-500">
                Record how the rabbit joined your farm.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="acquisition_source"
                    className={labelClass}
                  >
                    Acquisition source
                  </label>

                  <select
                    id="acquisition_source"
                    value={form.acquisition_source}
                    onChange={(event) =>
                      updateField(
                        "acquisition_source",
                        event.target.value as AcquisitionSource,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="born_on_farm">Born on farm</option>
                    <option value="purchased">Purchased</option>
                    <option value="transferred">Transferred</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="acquired_at" className={labelClass}>
                    Acquisition date
                  </label>

                  <input
                    id="acquired_at"
                    type="date"
                    max={new Date().toLocaleDateString("en-CA")}
                    value={form.acquired_at}
                    onChange={(event) =>
                      updateField("acquired_at", event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="acquisition_cost"
                    className={labelClass}
                  >
                    Acquisition cost (KSh)
                  </label>

                  <input
                    id="acquisition_cost"
                    type="number"
                    min="0"
                    max="9999999999.99"
                    step="0.01"
                    value={form.acquisition_cost}
                    onChange={(event) =>
                      updateField("acquisition_cost", event.target.value)
                    }
                    placeholder="e.g. 1500.00"
                    className={inputClass}
                  />
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-stone-400">
                Record a cost only when applicable. For farm-born rabbits,
                we can later calculate production costs separately.
              </p>
            </section>

            {/* Rabbit photograph */}
            <section className="border-t border-stone-100 pt-7">
            <h3 className="font-bold text-stone-900">
                Rabbit photograph
            </h3>

            <p className="mt-1 text-sm text-stone-500">
                Upload a clear photograph to help identify this rabbit.
            </p>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex h-48 w-48 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50">
                {imagePreview ? (
                    <img
                    src={imagePreview}
                    alt="Preview of the selected rabbit"
                    className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="px-4 text-center text-sm text-stone-400">
                    No photograph selected
                    </div>
                )}
                </div>

                <div className="flex-1">
                <label htmlFor="rabbit-image" className={labelClass}>
                    Choose a photograph
                </label>

                <input
                    id="rabbit-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-green-800`}
                    onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;

                    if (!file) {
                        setImage(null);
                        setImagePreview(null);
                        return;
                    }

                    if (file.size > 5 * 1024 * 1024) {
                        setError("Please select an image smaller than 5 MB.");
                        event.target.value = "";
                        setImage(null);
                        setImagePreview(null);
                        return;
                    }

                    setError("");
                    setImage(file);
                    setImagePreview(URL.createObjectURL(file));
                    }}
                />

                <p className="mt-2 text-xs leading-5 text-stone-500">
                    JPG, PNG, or WebP. Maximum file size: 5 MB.
                    You can leave this empty if a photograph is unavailable.
                </p>

                {image && (
                    <button
                    type="button"
                    className="mt-3 text-sm font-semibold text-red-600 hover:text-red-800"
                    onClick={() => {
                        setImage(null);
                        setImagePreview(null);

                        const input = document.getElementById(
                        "rabbit-image",
                        ) as HTMLInputElement | null;

                        if (input) input.value = "";
                    }}
                    >
                    Remove selected photograph
                    </button>
                )}
                </div>
            </div>
            </section>

            {/* Notes */}
            <section className="border-t border-stone-100 pt-7">
              <label htmlFor="notes" className={labelClass}>
                Additional notes
              </label>

              <textarea
                id="notes"
                rows={4}
                maxLength={5000}
                value={form.notes}
                onChange={(event) =>
                  updateField("notes", event.target.value)
                }
                placeholder="Record identifying marks or other useful observations..."
                className={`${inputClass} resize-y`}
              />
            </section>
          </div>

          {/* Form actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-stone-100 bg-stone-50/70 p-5 sm:flex-row sm:justify-end sm:px-7">
            <Link
              href="/rabbits"
              className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <LoaderCircle size={17} className="animate-spin" />
              )}

              {submitting ? "Registering..." : "Register rabbit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}