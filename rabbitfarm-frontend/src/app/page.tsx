import {
  Rabbit,
  Venus,
  Mars,
  Wheat,
  CalendarDays,
  ArrowRight,
  Clock3,
} from "lucide-react";

import Link from "next/link";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";

import StatCard from "@/components/dashboard/StatCard";
import FarmOverview from "@/components/dashboard/FarmOverview";
import RecentActivity from "@/components/dashboard/RecentActivity";

const stats = [
  {
    title: "Total rabbits",
    value: "120",
    description: "All active farm rabbits",
    icon: Rabbit,
    iconColor: "text-green-700",
    iconBackground: "bg-green-50",
  },
  {
    title: "Breeding does",
    value: "35",
    description: "Female breeding rabbits",
    icon: Venus,
    iconColor: "text-pink-700",
    iconBackground: "bg-pink-50",
  },
  {
    title: "Breeding bucks",
    value: "12",
    description: "Male breeding rabbits",
    icon: Mars,
    iconColor: "text-blue-700",
    iconBackground: "bg-blue-50",
  },
  {
    title: "Feed inventory",
    value: "85 kg",
    description: "Illustrative stock balance",
    icon: Wheat,
    iconColor: "text-amber-700",
    iconBackground: "bg-amber-50",
  },
];

const reminders = [
  {
    title: "Pregnancy checks",
    description: "Review does due for a check",
    count: "4",
    href: "/breeding",
  },
  {
    title: "Upcoming kindling",
    description: "Review expected kindling dates",
    count: "3",
    href: "/breeding",
  },
  {
    title: "Feed stock alerts",
    description: "Review inventory thresholds",
    count: "2",
    href: "/inventory",
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#f8f9f6] text-stone-900">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        <div className="min-w-0 flex-1 lg:ml-64">
          <AppHeader />

          <main className="mx-auto max-w-[1600px] p-5 sm:p-8">
            {/* Page heading */}
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-green-700">
                  FARM OVERVIEW
                </p>

                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Dashboard
                </h1>

                <p className="mt-2 text-sm text-stone-500">
                  Welcome to RabbitFarm Manager. Here's your farm overview.
                </p>
              </div>

              <Link
                href="/rabbits/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
              >
                <Rabbit size={18} />
                Register rabbit
              </Link>
            </div>

            {/* Statistics */}
            <section
              aria-label="Farm statistics"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              {stats.map((stat) => (
                <StatCard key={stat.title} {...stat} />
              ))}
            </section>

            {/* Main dashboard content */}
            <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
              <FarmOverview />
              <RecentActivity />
            </div>

            {/* Reminders */}
            <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <CalendarDays size={21} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">Farm reminders</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Activities to review
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                {reminders.map((reminder) => (
                  <Link
                    key={reminder.title}
                    href={reminder.href}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-stone-200 p-4 transition hover:border-green-200 hover:bg-green-50/50"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <Clock3
                        size={19}
                        className="mt-0.5 shrink-0 text-stone-400 group-hover:text-green-700"
                      />

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-800">
                          {reminder.title}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-stone-500">
                          {reminder.description}
                        </p>
                      </div>
                    </div>

                    <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-amber-50 px-2 text-sm font-bold text-amber-700">
                      {reminder.count}
                    </span>
                  </Link>
                ))}
              </div>

              <p className="mt-4 text-xs text-stone-400">
                Reminder counts are sample data until the backend integration
                is complete.
              </p>
            </section>

            {/* Footer */}
            <footer className="mt-8 flex flex-col gap-2 border-t border-stone-200 pt-5 text-xs text-stone-400 sm:flex-row sm:justify-between">
              <p>RabbitFarm Manager · Farm management made simpler.</p>
              <p>Dashboard preview · Version 1.0</p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}