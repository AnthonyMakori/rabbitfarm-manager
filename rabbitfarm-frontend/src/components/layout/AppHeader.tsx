import {
  Bell,
  CalendarDays,
  ChevronDown,
  Search,
} from "lucide-react";

export default function AppHeader() {
  const today = new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="flex min-h-20 items-center justify-between gap-4 border-b border-stone-200 bg-white px-5 sm:px-8">
      {/* Search */}
      <div className="relative hidden w-full max-w-md sm:block">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
        />

        <input
          type="search"
          placeholder="Search rabbits, records..."
          aria-label="Search farm records"
          className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-green-600 focus:bg-white"
        />
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3 sm:gap-5">
        <div className="hidden items-center gap-2 text-sm text-stone-500 md:flex">
          <CalendarDays size={17} />
          <span>{today}</span>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-xl border border-stone-200 p-2.5 text-stone-600 hover:bg-stone-50"
        >
          <Bell size={19} />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500" />
        </button>

        <div className="flex items-center gap-2 border-l border-stone-200 pl-3 sm:pl-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-800">
            RF
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-stone-800">
              Farm Owner
            </p>
            <p className="text-xs text-stone-500">Administrator</p>
          </div>

          <ChevronDown size={16} className="hidden text-stone-400 sm:block" />
        </div>
      </div>
    </header>
  );
}