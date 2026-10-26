"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Rabbit,
  GitBranch,
  Baby,
  HeartPulse,
  House,
  Wheat,
  ShoppingCart,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  ChevronLeft,
  Leaf,
  Package,
  Users,
} from "lucide-react";

const navigation = [
  {
    title: "MAIN MENU",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Rabbits", href: "/rabbits", icon: Rabbit },
      { name: "Breeding", href: "/breedings", icon: GitBranch },
      { name: "Litters", href: "/kindlings", icon: Baby },
    ],
  },
  {
    title: "FARM OPERATIONS",
    items: [
      { name: "Health", href: "/health", icon: HeartPulse },
      { name: "Housing", href: "/housing", icon: House },
      { name: "Feeds", href: "/feed", icon: Wheat },
      { name: "Inventory", href: "/inventory", icon: Package },
    ],
  },
  {
    title: "BUSINESS",
    items: [
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Sales", href: "/sales", icon: ShoppingCart },
      { name: "Expenses", href: "/expenses", icon: Wallet },
      { name: "Reports", href: "/reports", icon: ChartNoAxesCombined },
    ],
  },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
     <aside className="fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-stone-200 bg-white">      <div className="flex h-20 items-center gap-3 border-b border-stone-100 px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-700 text-white">
          <Rabbit size={25} />
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-tight text-stone-900">
            RabbitFarm
          </h1>
          <p className="text-xs text-stone-500">Farm Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 space-y-7 overflow-y-auto px-4 py-6">
        {navigation.map((group) => (
          <div key={group.title}>
            <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.15em] text-stone-400">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-green-50 text-green-800"
                        : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                    }`}
                  >
                    <Icon size={19} strokeWidth={1.8} />
                    <span>{item.name}</span>

                    {isActive && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-green-700" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-stone-100 p-4">
        <Link
          href="/settings"
          className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
            pathname === "/settings"
              ? "bg-green-50 text-green-800"
              : "text-stone-600 hover:bg-stone-50"
          }`}
        >
          <Settings size={19} />
          Settings
        </Link>

        <div className="rounded-xl bg-green-50 p-4">
          <Leaf size={20} className="mb-2 text-green-700" />

          <p className="text-sm font-semibold text-green-900">
            Healthy farm, healthy profits
          </p>

          <p className="mt-1 text-xs leading-5 text-green-800/70">
            Keep your farm records up to date.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between px-2 text-xs text-stone-400">
          <span>RabbitFarm v1.0</span>
          <ChevronLeft size={15} />
        </div>
      </div>
    </aside>
  );
}