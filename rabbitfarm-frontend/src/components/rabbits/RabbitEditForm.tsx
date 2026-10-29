"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Save,
} from "lucide-react";

import {
  getRabbit,
  getRabbitImageUrl,
  updateRabbit,
  type Rabbit,
  type RabbitInput,
  type RabbitCategory,
  type RabbitSex,
  type RabbitStatus,
  type AcquisitionSource,
} from "@/lib/api";

const inputClass =
  "mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100";

const labelClass = "text-sm font-semibold text-stone-700";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function RabbitEditForm({
  rabbitId,
}: {
  rabbitId: number;
}) {
  const [rabbit, setRabbit] = useState<Rabbit | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState<RabbitSex>("female");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [weightKg, setWeightKg] = useState("");

  const [category, setCategory] =
    useState<RabbitCategory>("growing");

  const [status, setStatus] = useState<RabbitStatus>("active");

  const [acquisitionSource, setAcquisitionSource] =
    useState<AcquisitionSource>("born_on_farm");

  const [acquisitionCost, setAcquisitionCost] = useState("");
  const [acquiredAt, setAcquiredAt] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [notes, setNotes] = useState("");

  const [image, setImage] = useState<File | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(
    null,
  );

  // Load the existing rabbit and populate the form.
  useEffect(() => {
    let cancelled = false;

    async function loadRabbit() {
      try {
        setLoading(true);
        setError("");

        const record = await getRabbit(rabbitId);

        if (cancelled) return;

        setRabbit(record);
        setName(record.name ?? "");
        setBreed(record.breed);
        setSex(record.sex);
        setDateOfBirth(record.date_of_birth ?? "");

        setWeightKg(
          record.weight_kg == null
            ? ""
            : String(record.weight_kg),
        );

        setCategory(record.category);
        setStatus(record.status);
        setAcquisitionSource(record.acquisition_source);

        setAcquisitionCost(
          record.acquisition_cost == null
            ? ""
            : String(record.acquisition_cost),
        );

        setAcquiredAt(record.acquired_at ?? "");
        setExitDate(record.exit_date ?? "");
        setNotes(record.notes ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load this rabbit.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (Number.isInteger(rabbitId) && rabbitId > 0) {
      void loadRabbit();
    } else {
      setError("Invalid rabbit ID.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [rabbitId]);

  // Create and clean up temporary image preview URLs.
  useEffect(() => {
    if (!image) {
      setImagePreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(image);
    setImagePreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [image]);

  const existingImageUrl = rabbit
    ? getRabbitImageUrl(rabbit)
    : null;

  const displayedImage = imagePreview ?? existingImageUrl;

  // Validate a selected image before accepting it.
  function handleImageChange(file: File | null) {
    setError("");
    setSuccess(false);

    if (!file) {
      setImage(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");

      // Reset the file input so the user can select another image.
      const input = document.getElementById(
        "edit-image",
      ) as HTMLInputElement | null;

      if (input) input.value = "";

      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("The photograph must be 5 MB or smaller.");

      // Reset the file input after an invalid file selection.
      const input = document.getElementById(
        "edit-image",
      ) as HTMLInputElement | null;

      if (input) input.value = "";

      return;
    }

    // Keep the actual File object so updateRabbit can upload it.
    setImage(file);
  }

  // Cancel a pending photo replacement.
  function cancelImageReplacement() {
    setImage(null);

    const input = document.getElementById(
      "edit-image",
    ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }

    setError("");
  }

  // Validate and submit the updated rabbit information.
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    if (!breed.trim()) {
      setError("Please enter the rabbit's breed.");
      return;
    }

    if (
      weightKg.trim() !== "" &&
      (!Number.isFinite(Number(weightKg)) ||
        Number(weightKg) <= 0)
    ) {
      setError("Weight must be a number greater than zero.");
      return;
    }

    if (
      acquisitionCost.trim() !== "" &&
      (!Number.isFinite(Number(acquisitionCost)) ||
        Number(acquisitionCost) < 0)
    ) {
      setError("Acquisition cost cannot be negative.");
      return;
    }

    setSubmitting(true);

    try {
      const payload: Partial<RabbitInput> = {
        name: name.trim() || null,
        breed: breed.trim(),
        sex,
        date_of_birth: dateOfBirth || null,

        weight_kg:
          weightKg.trim() !== ""
            ? Number(weightKg)
            : null,

        category,
        status,
        acquisition_source: acquisitionSource,

        acquisition_cost:
          acquisitionCost.trim() !== ""
            ? Number(acquisitionCost)
            : null,

        acquired_at: acquiredAt || null,
        exit_date: exitDate || null,
        notes: notes.trim() || null,

        // Send the actual File object, not the preview URL.
        // If no replacement was selected, leave image null.
        image: image ?? null,
      };

      const updatedRabbit = await updateRabbit(
        rabbitId,
        payload,
      );

      // Update the form with the server's saved record.
      setRabbit(updatedRabbit);
      setImage(null);

      // Reset the file input after a successful update.
      // This also allows the same photograph to be selected again.
      const imageInput = document.getElementById(
        "edit-image",
      ) as HTMLInputElement | null;

      if (imageInput) {
        imageInput.value = "";
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while updating the rabbit.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state.
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-stone-500">
        <LoaderCircle
          size={20}
          className="animate-spin"
        />
        Loading rabbit details...
      </div>
    );
  }

  // Handle a missing rabbit or a failed request.
  if (!rabbit) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-6">
        <p className="whitespace-pre-line text-sm text-red-700">
          {error || "Rabbit record not found."}
        </p>

        <Link
          href="/rabbits"
          className="mt-4 inline-flex text-sm font-semibold text-green-800 underline"
        >
          Return to rabbit registry
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/rabbits/${rabbit.id}`}
        className="mb-5 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-green-700"
      >
        <ArrowLeft size={16} />
        Back to rabbit details
      </Link>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {/* Form heading */}
        <div className="border-b border-stone-100 p-5 sm:p-7">
          <p className="text-sm font-semibold text-green-800">
            {rabbit.rabbit_code ?? `Rabbit #${rabbit.id}`}
          </p>

          <h1 className="mt-1 text-2xl font-bold text-stone-900">
            Edit rabbit
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            Update this rabbit's information. Its identification
            code will remain unchanged.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-8 p-5 sm:p-7">
            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div
                role="status"
                className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
              >
                <CheckCircle2 size={20} />
                Rabbit details saved successfully.
              </div>
            )}

            {/* Basic information */}
            <section>
              <h2 className="font-bold text-stone-900">
                Basic information
              </h2>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Rabbit name */}
                <div>
                  <label
                    htmlFor="edit-name"
                    className={labelClass}
                  >
                    Rabbit name
                  </label>

                  <input
                    id="edit-name"
                    value={name}
                    maxLength={100}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Breed */}
                <div>
                  <label
                    htmlFor="edit-breed"
                    className={labelClass}
                  >
                    Breed *
                  </label>

                  <input
                    id="edit-breed"
                    required
                    value={breed}
                    maxLength={100}
                    onChange={(e) => setBreed(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Sex */}
                <div>
                  <label
                    htmlFor="edit-sex"
                    className={labelClass}
                  >
                    Sex
                  </label>

                  <select
                    id="edit-sex"
                    value={sex}
                    onChange={(e) =>
                      setSex(e.target.value as RabbitSex)
                    }
                    className={inputClass}
                  >
                    <option value="female">
                      Female (Doe)
                    </option>

                    <option value="male">
                      Male (Buck)
                    </option>
                  </select>
                </div>

                {/* Date of birth */}
                <div>
                  <label
                    htmlFor="edit-dob"
                    className={labelClass}
                  >
                    Date of birth
                  </label>

                  <input
                    id="edit-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) =>
                      setDateOfBirth(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                {/* Weight */}
                <div>
                  <label
                    htmlFor="edit-weight"
                    className={labelClass}
                  >
                    Current weight (kg)
                  </label>

                  <input
                    id="edit-weight"
                    type="number"
                    min="0.001"
                    max="99999.999"
                    step="0.001"
                    value={weightKg}
                    onChange={(e) =>
                      setWeightKg(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                {/* Production category */}
                <div>
                  <label
                    htmlFor="edit-category"
                    className={labelClass}
                  >
                    Production category
                  </label>

                  <select
                    id="edit-category"
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value as RabbitCategory,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="kit">Kit</option>

                    <option value="growing">
                      Growing rabbit
                    </option>

                    <option value="breeding">
                      Breeding rabbit
                    </option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label
                    htmlFor="edit-status"
                    className={labelClass}
                  >
                    Status
                  </label>

                  <select
                    id="edit-status"
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value as RabbitStatus,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="sold">Sold</option>
                    <option value="deceased">Deceased</option>
                    <option value="culled">Culled</option>

                    <option value="transferred">
                      Transferred
                    </option>
                  </select>
                </div>
              </div>
            </section>

            {/* Acquisition information */}
            <section className="border-t border-stone-100 pt-7">
              <h2 className="font-bold text-stone-900">
                Acquisition information
              </h2>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Acquisition source */}
                <div>
                  <label
                    htmlFor="edit-source"
                    className={labelClass}
                  >
                    Acquisition source
                  </label>

                  <select
                    id="edit-source"
                    value={acquisitionSource}
                    onChange={(e) =>
                      setAcquisitionSource(
                        e.target.value as AcquisitionSource,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="born_on_farm">
                      Born on farm
                    </option>

                    <option value="purchased">
                      Purchased
                    </option>

                    <option value="transferred">
                      Transferred
                    </option>
                  </select>
                </div>

                {/* Acquisition date */}
                <div>
                  <label
                    htmlFor="edit-acquired"
                    className={labelClass}
                  >
                    Acquisition date
                  </label>

                  <input
                    id="edit-acquired"
                    type="date"
                    value={acquiredAt}
                    onChange={(e) =>
                      setAcquiredAt(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                {/* Acquisition cost */}
                <div>
                  <label
                    htmlFor="edit-cost"
                    className={labelClass}
                  >
                    Acquisition cost (KSh)
                  </label>

                  <input
                    id="edit-cost"
                    type="number"
                    min="0"
                    max="9999999999.99"
                    step="0.01"
                    value={acquisitionCost}
                    onChange={(e) =>
                      setAcquisitionCost(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                {/* Exit date */}
                <div>
                  <label
                    htmlFor="edit-exit-date"
                    className={labelClass}
                  >
                    Exit date (if applicable)
                  </label>

                  <input
                    id="edit-exit-date"
                    type="date"
                    value={exitDate}
                    onChange={(e) =>
                      setExitDate(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            {/* Rabbit photograph */}
            <section className="border-t border-stone-100 pt-7">
              <h2 className="font-bold text-stone-900">
                Rabbit photograph
              </h2>

              <p className="mt-1 text-sm text-stone-500">
                Choose a new photo to replace the current one.
                Leave it unchanged to keep the existing photo.
              </p>

              <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
                {/* Current photo or preview of replacement */}
                <div className="flex h-48 w-48 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                  {displayedImage ? (
                    <img
                      key={displayedImage}
                      src={displayedImage}
                      alt={`Photograph of ${
                        rabbit.name || "rabbit"
                      }`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-4 text-center text-sm text-stone-400">
                      No photograph available
                    </span>
                  )}
                </div>

                {/* Photo upload controls */}
                <div className="flex-1">
                  <label
                    htmlFor="edit-image"
                    className={labelClass}
                  >
                    Replace photograph
                  </label>

                  <input
                    id="edit-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className={inputClass}
                    onChange={(e) =>
                      handleImageChange(
                        e.target.files?.[0] ?? null,
                      )
                    }
                  />

                  <p className="mt-2 text-xs text-stone-500">
                    JPG, PNG, or WebP. Maximum 5 MB.
                  </p>

                  {image && (
                    <button
                      type="button"
                      onClick={cancelImageReplacement}
                      className="mt-3 text-sm font-semibold text-red-600 hover:text-red-800"
                    >
                      Cancel photo replacement
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Additional notes */}
            <section className="border-t border-stone-100 pt-7">
              <label
                htmlFor="edit-notes"
                className={labelClass}
              >
                Additional notes
              </label>

              <textarea
                id="edit-notes"
                rows={4}
                maxLength={5000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputClass} resize-y`}
              />
            </section>
          </div>

          {/* Form actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-stone-100 bg-stone-50/70 p-5 sm:flex-row sm:justify-end sm:px-7">
            <Link
              href={`/rabbits/${rabbit.id}`}
              className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Save size={17} />
              )}

              {submitting
                ? "Saving changes..."
                : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}