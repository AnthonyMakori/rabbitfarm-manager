"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  ExternalLink,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Rabbit,
  Search,
  Settings,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

interface DashboardReminder {
  key: string;
  title: string;
  description: string;
  count: number;
  href: string;
}

interface DashboardResponse {
  data?: {
    reminders?: DashboardReminder[];
  };
}

interface FarmSettingsResponse {
  data?: {
    farm_name?: string;
    name?: string;
    settings?: {
      farm_name?: string;
    };
    farm?: {
      farm_name?: string;
      name?: string;
    };
  };
  farm_name?: string;
}

const searchablePages = [
  {
    label: "Dashboard",
    description: "Farm overview and activity",
    href: "/",
    keywords: "home overview statistics",
    icon: LayoutDashboard,
  },
  {
    label: "Rabbits",
    description: "View and register rabbits",
    href: "/rabbits",
    keywords: "animals rabbit population",
    icon: Rabbit,
  },
  {
    label: "Breeding",
    description: "Manage mating and pregnancy records",
    href: "/breedings",
    keywords: "mating pregnancy breeding",
    icon: HeartPulse,
  },
  {
    label: "Kindlings",
    description: "Manage litters and newborn kits",
    href: "/kindlings",
    keywords: "birth litter kits",
    icon: Activity,
  },
  {
    label: "Health",
    description: "Health records and treatments",
    href: "/health",
    keywords: "medical treatment disease vaccination",
    icon: HeartPulse,
  },
  {
    label: "Housing",
    description: "Manage housing units",
    href: "/housing",
    keywords: "cages hutches housing units",
    icon: Rabbit,
  },
  {
    label: "Inventory",
    description: "Manage stock and supplies",
    href: "/inventory",
    keywords: "stock supplies reorder",
    icon: Package,
  },
  {
    label: "Feed",
    description: "Manage feed records",
    href: "/feed",
    keywords: "food pellets hay feeding",
    icon: Package,
  },
  {
    label: "Customers",
    description: "Manage customer records",
    href: "/customers",
    keywords: "buyers clients contacts",
    icon: Users,
  },
  {
    label: "Sales",
    description: "Sales and payments",
    href: "/sales",
    keywords: "orders revenue payments",
    icon: ShoppingCart,
  },
  {
    label: "Expenses",
    description: "Track farm expenses",
    href: "/expenses",
    keywords: "costs spending payments",
    icon: FileText,
  },
  {
    label: "Reports",
    description: "View farm reports",
    href: "/reports",
    keywords: "analytics exports pdf csv",
    icon: FileText,
  },
  {
    label: "Settings",
    description: "Farm profile and preferences",
    href: "/settings",
    keywords: "configuration currency timezone profile",
    icon: Settings,
  },
];

export default function AppHeader() {
  const router = useRouter();

  const [today, setToday] = useState("");
  const [farmName, setFarmName] = useState("RabbitFarm Manager");
  const [reminders, setReminders] = useState<DashboardReminder[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Format the date after mounting to prevent server/client hydration mismatches.
  useEffect(() => {
    const updateDate = () => {
      setToday(
        new Intl.DateTimeFormat("en-KE", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "Africa/Nairobi",
        }).format(new Date()),
      );
    };

    updateDate();
  }, []);

  // Load the saved farm name and display a sensible fallback if settings are unavailable.
  useEffect(() => {
    const controller = new AbortController();

    async function loadFarmSettings() {
      try {
        const response = await fetch(`${API_BASE_URL}/settings/farm`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) return;

        const result: FarmSettingsResponse = await response.json();

        const name =
          result.data?.farm_name ??
          result.data?.settings?.farm_name ??
          result.data?.farm?.farm_name ??
          result.data?.farm?.name ??
          result.data?.name ??
          result.farm_name;

        if (typeof name === "string" && name.trim()) {
          setFarmName(name.trim());
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;

        // Keep the fallback name if the backend is temporarily unavailable.
      }
    }

    void loadFarmSettings();

    return () => controller.abort();
  }, []);

  // Use the dashboard's real reminders instead of a permanently displayed notification dot.
  const loadNotifications = useCallback(async (signal?: AbortSignal) => {
    setNotificationsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/overview`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error("Unable to load farm reminders.");
      }

      const result: DashboardResponse = await response.json();

      setReminders(
        Array.isArray(result.data?.reminders)
          ? result.data.reminders
          : [],
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;

      setReminders([]);
    } finally {
      if (!signal?.aborted) {
        setNotificationsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void loadNotifications(controller.signal);

    return () => controller.abort();
  }, [loadNotifications]);

  // Close menus when clicking outside them or pressing Escape.
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (!searchRef.current?.contains(target)) {
        setSearchOpen(false);
      }

      if (!notificationsRef.current?.contains(target)) {
        setNotificationsOpen(false);
      }

      if (!profileRef.current?.contains(target)) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const filteredPages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return searchablePages.slice(0, 5);

    return searchablePages
      .filter((page) =>
        `${page.label} ${page.description} ${page.keywords}`
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 7);
  }, [searchQuery]);

  const notificationCount = reminders.reduce(
    (total, reminder) => total + Math.max(0, Number(reminder.count) || 0),
    0,
  );

  const initials = farmName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "RF";

  function closeMenus() {
    setSearchOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const firstResult = filteredPages[0];

    if (firstResult) {
      router.push(firstResult.href);
      setSearchQuery("");
      setSearchOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 flex min-h-20 items-center justify-between gap-3 border-b border-stone-200 bg-white/95 px-4 backdrop-blur sm:gap-4 sm:px-6 lg:px-8">
      {/* Search pages and application sections */}
      <div ref={searchRef} className="relative hidden w-full max-w-md sm:block">
        <form onSubmit={handleSearchSubmit} role="search">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search farm sections..."
            aria-label="Search farm sections"
            aria-expanded={searchOpen}
            aria-controls="header-search-results"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-10 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-100"
          />

          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearchQuery("");
                setSearchOpen(true);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X size={16} />
            </button>
          )}
        </form>

        {searchOpen && (
          <div
            id="header-search-results"
            className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-white py-2 shadow-xl"
          >
            <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
              {searchQuery.trim() ? "Search results" : "Quick navigation"}
            </p>

            {filteredPages.length > 0 ? (
              filteredPages.map((page) => {
                const Icon = page.icon;

                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    onClick={() => {
                      setSearchQuery("");
                      setSearchOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-green-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                      <Icon size={18} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-stone-800">
                        {page.label}
                      </span>
                      <span className="block truncate text-xs text-stone-500">
                        {page.description}
                      </span>
                    </span>

                    <ExternalLink
                      size={14}
                      className="text-stone-400"
                      aria-hidden="true"
                    />
                  </Link>
                );
              })
            ) : (
              <p className="px-4 py-5 text-sm text-stone-500">
                No matching sections found.
              </p>
            )}

            <p className="border-t border-stone-100 px-4 pt-3 text-xs text-stone-400">
              Search matches pages and sections, not individual records.
            </p>
          </div>
        )}
      </div>

      {/* Compact brand on smaller screens */}
      <Link
        href="/"
        onClick={closeMenus}
        className="flex min-w-0 items-center gap-2 sm:hidden"
        aria-label="RabbitFarm Manager dashboard"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 text-sm font-bold text-green-800">
          {initials}
        </span>
        <span className="max-w-32 truncate text-sm font-semibold text-stone-800">
          {farmName}
        </span>
      </Link>

      {/* Date, notifications and profile */}
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden items-center gap-2 text-sm text-stone-500 md:flex">
          <CalendarDays size={17} aria-hidden="true" />
          <span>{today || "\u00A0"}</span>
        </div>

        {/* Notifications dropdown */}
        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            aria-label={
              notificationCount > 0
                ? `Farm notifications: ${notificationCount} outstanding items`
                : "Farm notifications"
            }
            aria-expanded={notificationsOpen}
            aria-haspopup="true"
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setProfileOpen(false);
              setSearchOpen(false);
            }}
            className="relative rounded-xl border border-stone-200 p-2.5 text-stone-600 transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-green-200"
          >
            <Bell size={19} aria-hidden="true" />

            {!notificationsLoading && notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-stone-800">
                    Farm reminders
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    Items that may need your attention
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Refresh reminders"
                  onClick={() => void loadNotifications()}
                  className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                >
                  <Activity size={17} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {notificationsLoading ? (
                  <p className="px-3 py-6 text-center text-sm text-stone-500">
                    Loading reminders...
                  </p>
                ) : reminders.length === 0 ? (
                  <div className="px-3 py-8 text-center">
                    <Check
                      size={24}
                      className="mx-auto mb-2 text-green-600"
                    />
                    <p className="text-sm font-medium text-stone-700">
                      No reminders available
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Reminders will appear when the dashboard provides them.
                    </p>
                  </div>
                ) : (
                  reminders.map((reminder) => (
                    <Link
                      key={reminder.key}
                      href={reminder.href}
                      onClick={() => setNotificationsOpen(false)}
                      className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-stone-50"
                    >
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          reminder.count > 0
                            ? "bg-amber-50 text-amber-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {reminder.count > 0 ? (
                          <CircleAlert size={18} />
                        ) : (
                          <Check size={18} />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-stone-800">
                            {reminder.title}
                          </span>
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                            {reminder.count}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-stone-500">
                          {reminder.description}
                        </span>
                      </span>
                    </Link>
                  ))
                )}
              </div>

              <div className="border-t border-stone-100 p-3">
                <button
                  type="button"
                  onClick={() => void loadNotifications()}
                  className="w-full rounded-xl px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50"
                >
                  Refresh reminders
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Farm profile dropdown */}
        <div
          ref={profileRef}
          className="relative border-l border-stone-200 pl-3 sm:pl-4"
        >
          <button
            type="button"
            aria-label="Open farm profile menu"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotificationsOpen(false);
              setSearchOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-green-200 sm:gap-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-800 sm:h-10 sm:w-10">
              {initials}
            </span>

            <span className="hidden max-w-36 sm:block">
              <span className="block truncate text-sm font-semibold text-stone-800">
                {farmName}
              </span>
              <span className="block text-xs text-stone-500">
                Farm profile
              </span>
            </span>

            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`hidden text-stone-400 transition sm:block ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-3 w-64 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
              <div className="border-b border-stone-100 px-4 py-4">
                <p className="truncate text-sm font-semibold text-stone-800">
                  {farmName}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Farm account
                </p>
              </div>

              <div className="p-2">
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-stone-700 transition hover:bg-stone-50"
                >
                  <Settings size={18} className="text-stone-500" />
                  Farm settings
                </Link>

                <Link
                  href="/reports"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-stone-700 transition hover:bg-stone-50"
                >
                  <FileText size={18} className="text-stone-500" />
                  Farm reports
                </Link>

                <Link
                  href="/activity"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-stone-700 transition hover:bg-stone-50"
                >
                  <Clock size={18} className="text-stone-500" />
                  Activity history
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}