
import { Rabbit, Mars, Venus, Baby } from "lucide-react";
import type { PopulationItem } from "@/lib/dashboard-api";

const styles: Record<
  string,
  {
    icon: typeof Rabbit;
    color: string;
    background: string;
    text: string;
  }
> = {
  does: {
    icon: Venus,
    color: "bg-pink-500",
    background: "bg-pink-50",
    text: "text-pink-700",
  },
  bucks: {
    icon: Mars,
    color: "bg-blue-500",
    background: "bg-blue-50",
    text: "text-blue-700",
  },
  growing: {
    icon: Rabbit,
    color: "bg-amber-500",
    background: "bg-amber-50",
    text: "text-amber-700",
  },
  kits: {
    icon: Baby,
    color: "bg-purple-500",
    background: "bg-purple-50",
    text: "text-purple-700",
  },
};

interface FarmOverviewProps {
  population: PopulationItem[];
  total: number;
}

export default function FarmOverview({
  population,
  total,
}: FarmOverviewProps) {
  const items = population.map((item) => ({
    ...item,
    ...(styles[item.key] ?? styles.growing),
  }));

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900">
            Rabbit population
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Active registered rabbits by production category
          </p>
        </div>

        <div className="rounded-xl bg-green-50 p-3 text-green-700">
          <Rabbit size={23} />
        </div>
      </div>

      <div className="mt-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">Total active rabbits</p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-stone-900">
            {total.toLocaleString()}
          </p>
        </div>
        <p className="text-xs text-stone-400">Live database</p>
      </div>

      <div
        className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-stone-100"
        aria-label="Rabbit population distribution"
      >
        {items.map((item) => (
          <div
            key={item.key}
            className={`${item.color} h-full transition-all`}
            style={{
              width: total > 0 ? `${(item.count / total) * 100}%` : "0%",
            }}
            title={`${item.label}: ${item.count}`}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className="flex items-center gap-3 rounded-xl border border-stone-100 p-3"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.background} ${item.text}`}
              >
                <Icon size={20} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs text-stone-500">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-bold text-stone-900">
                  {item.count.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
