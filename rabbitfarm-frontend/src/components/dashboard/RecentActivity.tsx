import Link from "next/link";
import {
  Rabbit,
  HeartPulse,
  ShoppingCart,
  Baby,
  ArrowRight,
} from "lucide-react";

const activities = [
  {
    id: 1,
    title: "Rabbit registered",
    detail: "RBT-0120 · New rabbit profile",
    date: "Sample activity",
    icon: Rabbit,
    background: "bg-green-50",
    color: "text-green-700",
  },
  {
    id: 2,
    title: "Health record updated",
    detail: "RBT-0042 · Treatment record",
    date: "Sample activity",
    icon: HeartPulse,
    background: "bg-red-50",
    color: "text-red-700",
  },
  {
    id: 3,
    title: "Sale recorded",
    detail: "SAL-0018 · Rabbit sale",
    date: "Sample activity",
    icon: ShoppingCart,
    background: "bg-blue-50",
    color: "text-blue-700",
  },
  {
    id: 4,
    title: "Litter registered",
    detail: "LIT-0012 · New litter record",
    date: "Sample activity",
    icon: Baby,
    background: "bg-purple-50",
    color: "text-purple-700",
  },
];

export default function RecentActivity() {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900">
            Recent activity
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            An overview of farm operations
          </p>
        </div>

        <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
          Demo
        </span>
      </div>

      <div className="mt-5 divide-y divide-stone-100">
        {activities.map((activity) => {
          const Icon = activity.icon;

          return (
            <div key={activity.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activity.background} ${activity.color}`}
              >
                <Icon size={19} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-800">
                  {activity.title}
                </p>

                <p className="mt-1 truncate text-xs text-stone-500">
                  {activity.detail}
                </p>
              </div>

              <span className="shrink-0 self-center text-[10px] text-stone-400">
                {activity.date}
              </span>
            </div>
          );
        })}
      </div>

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