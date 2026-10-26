import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: "up" | "down";
  };
  iconColor: string;
  iconBackground: string;
};

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  iconColor,
  iconBackground,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-100/50 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-500">{title}</p>

          <h3 className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
            {value}
          </h3>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBackground} ${iconColor}`}
        >
          <Icon size={22} strokeWidth={1.8} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 font-semibold ${
              trend.direction === "up"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}

            {trend.value}
          </span>
        )}

        <span className="text-stone-500">{description}</span>
      </div>
    </article>
  );
}