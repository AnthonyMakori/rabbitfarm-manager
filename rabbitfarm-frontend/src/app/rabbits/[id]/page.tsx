"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  HeartPulse,
  Pencil,
  Weight,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import { getRabbit, getRabbitImageUrl, type Rabbit } from "@/lib/api";
import RabbitHistory from "@/components/rabbits/RabbitHistory";

function formatDate(value: string | null): string {
  if (!value) return "Not recorded";

  // Avoid shifting a date-only value because of timezone conversion.
  const date = value.slice(0, 10);
  const [year, month, day] = date.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-stone-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-2 break-words font-semibold text-stone-900">
        {value}
      </p>
    </div>
  );
}

export default function RabbitDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [rabbit, setRabbit] = useState<Rabbit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRabbit() {
      if (!Number.isInteger(id) || id < 1) {
        setError("Invalid rabbit ID.");
        setLoading(false);
        return;
      }

      try {
        const result = await getRabbit(id);

        if (!cancelled) {
          setRabbit(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load rabbit details.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRabbit();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const imageUrl = rabbit ? getRabbitImageUrl(rabbit) : null;

  return (
    <div className="min-h-screen bg-[#f8f9f6] text-stone-900">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        <div className="min-w-0 flex-1">
          <AppHeader />

          <main className="mx-auto max-w-[1400px] p-5 sm:p-8">
            <Link
              href="/rabbits"
              className="mb-6 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-green-700"
            >
              <ArrowLeft size={16} />
              Back to rabbit registry
            </Link>

            {loading ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-stone-500">
                Loading rabbit profile...
              </div>
            ) : error || !rabbit ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
              >
                {error || "Rabbit record not found."}
              </div>
            ) : (
              <>
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">
                      RABBIT PROFILE
                    </p>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight">
                      {rabbit.name || "Unnamed rabbit"}
                    </h1>

                    <p className="mt-2 text-sm text-stone-500">
                      {rabbit.rabbit_code ?? `Record #${rabbit.id}`}
                    </p>
                  </div>

                  <Link
                    href={`/rabbits/${rabbit.id}/edit`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    <Pencil size={16} />
                    Edit rabbit
                  </Link>
                </div>

                <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(280px,380px)_1fr]">
                  {/* Photograph */}
                  <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                    <div className="flex aspect-[4/5] max-h-[520px] items-center justify-center bg-stone-100">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={`Photograph of ${rabbit.name || rabbit.rabbit_code || "rabbit"}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="px-6 text-center">
                          <Camera
                            size={42}
                            className="mx-auto text-stone-300"
                          />
                          <p className="mt-4 font-semibold text-stone-600">
                            No photograph yet
                          </p>
                          <p className="mt-2 text-sm text-stone-500">
                            Add a photo to make this rabbit easier to identify.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                        Breed
                      </p>
                      <p className="mt-1 text-lg font-bold text-stone-900">
                        {rabbit.breed}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-800">
                          {rabbit.category}
                        </span>

                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold capitalize text-stone-700">
                          {rabbit.status}
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* Details */}
                  <div className="space-y-6">
                    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
                      <div className="mb-5 flex items-center gap-2">
                        <HeartPulse size={20} className="text-green-700" />
                        <h2 className="text-lg font-bold">
                          Rabbit information
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Detail
                          label="Identification code"
                          value={rabbit.rabbit_code ?? `Record #${rabbit.id}`}
                        />

                        <Detail
                          label="Sex"
                          value={
                            rabbit.sex === "female"
                              ? "Female (Doe)"
                              : "Male (Buck)"
                          }
                        />

                        <Detail
                          label="Date of birth"
                          value={formatDate(rabbit.date_of_birth)}
                        />

                        <Detail
                          label="Current weight"
                          value={
                            rabbit.weight_kg != null
                              ? `${rabbit.weight_kg} kg`
                              : "Not recorded"
                          }
                        />

                        <Detail
                          label="Production category"
                          value={
                            rabbit.category.charAt(0).toUpperCase() +
                            rabbit.category.slice(1)
                          }
                        />

                        <Detail
                          label="Current status"
                          value={
                            rabbit.status.charAt(0).toUpperCase() +
                            rabbit.status.slice(1)
                          }
                        />
                      </div>
                    </section>

                    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
                      <div className="mb-5 flex items-center gap-2">
                        <CalendarDays size={20} className="text-green-700" />
                        <h2 className="text-lg font-bold">
                          Acquisition information
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Detail
                          label="Source"
                          value={rabbit.acquisition_source
                            .split("_")
                            .map(
                              (part) =>
                                part.charAt(0).toUpperCase() + part.slice(1),
                            )
                            .join(" ")}
                        />

                        <Detail
                          label="Acquisition date"
                          value={formatDate(rabbit.acquired_at)}
                        />

                        <Detail
                          label="Acquisition cost"
                          value={
                            rabbit.acquisition_cost != null
                              ? `KSh ${Number(rabbit.acquisition_cost).toLocaleString("en-KE", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : "Not recorded"
                          }
                        />

                        <Detail
                          label="Exit date"
                          value={formatDate(rabbit.exit_date)}
                        />
                      </div>
                    </section>

                    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
                      <div className="mb-4 flex items-center gap-2">
                        <Weight size={20} className="text-green-700" />
                        <h2 className="text-lg font-bold">Notes</h2>
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-6 text-stone-600">
                        {rabbit.notes || "No additional notes recorded."}
                      </p>
                    </section>
                    <div className="mt-8">
                      <RabbitHistory rabbitId={rabbit.id} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}