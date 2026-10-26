
import Link from "next/link";
import {
  Rabbit,
  HeartPulse,
  ShoppingCart,
  Baby,
  ReceiptText,
  ArrowRight,
  Clock3,
} from "lucide-react";
import type { RecentActivityItem } from "@/lib/dashboard-api";

const activityStyles: Record<
  string,
  { icon: typeof Rabbit; background: string; color: string }
> = {
  rabbit: {
    icon: Rabbit,
    background: "bg-green-50",
    color: "text-green-700",
  },
  sale: {
    icon: ShoppingCart,
    background: "bg-blue-50",
    color: "text-blue-700",
  },
  kindling: {
    icon: Baby,
    background: "bg-purple-50",
    color: "text-purple-700",
  },
  expense: {
    icon: ReceiptText,
    background: "bg-amber-50",
    color: "text-amber-700",
  },
  health: {
    icon: HeartPulse,
    background: "bg-red-50",
    color: "text-red-700",
  },
};

interface RecentActivityProps {
  activities: RecentActivityItem[];
}

function formatActivityDate(value: string | null): string {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function RecentActivity({
  activities,
}: RecentActivityProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900">
            Recent activity
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Latest recorded farm operations
          </p>
        </div>

        <span className="rounded-lg bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
          Live
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="py-12 text-center">
          <Clock3 className="mx-auto text-stone-300" size={30} />
          <p className="mt-3 text-sm font-medium text-stone-700">
            No recent activity yet
          </p>
          <p className="mt-1 text-xs text-stone-500">
            New farm records will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-stone-100">
          {activities.map((activity) => {
            const style = activityStyles[activity.type] ?? activityStyles.rabbit;
            const Icon = style.icon;

            return (
              <div
                key={activity.id}
                className="flex gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.background} ${style.color}`}
                >
                  <Icon size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-800">
                    {activity.title}
                  </p>
                  <p className="mt-1 break-words text-xs text-stone-500">
                    {activity.detail}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {formatActivityDate(activity.date)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/rabbits"
        className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-stone-200 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
      >
        Manage farm records
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}
