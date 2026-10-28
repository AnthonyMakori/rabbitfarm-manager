"use client";

import { useState } from "react";
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
  ChevronRight,
  Leaf,
  Package,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-stone-200 bg-white transition-[width] duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand */}
      <div
        className={`flex h-20 shrink-0 items-center border-b border-stone-100 ${
          isCollapsed ? "justify-center px-2" : "gap-3 px-6"
        }`}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white">
          <Rabbit size={25} />
        </div>

        {!isCollapsed && (
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-stone-900">
              RabbitFarm
            </h1>
            <p className="text-xs text-stone-500">Farm Management</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        className={`min-h-0 flex-1 space-y-7 overflow-y-auto overflow-x-hidden py-6 ${
          isCollapsed ? "px-3" : "px-4"
        }`}
      >
        {navigation.map((group) => (
          <div key={group.title}>
            {!isCollapsed && (
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.15em] text-stone-400">
                {group.title}
              </p>
            )}

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
                    title={isCollapsed ? item.name : undefined}
                    aria-label={item.name}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors ${
                      isCollapsed
                        ? "justify-center px-2"
                        : "gap-3 px-3"
                    } ${
                      isActive
                        ? "bg-green-50 text-green-800"
                        : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                    }`}
                  >
                    <Icon
                      size={19}
                      strokeWidth={1.8}
                      className="shrink-0"
                    />

                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}

                    {isActive && (
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full bg-green-700 ${
                          isCollapsed
                            ? "absolute right-1 top-2"
                            : "ml-auto"
                        }`}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-stone-100 p-3">
        {/* Settings */}
        <Link
          href="/settings"
          title={isCollapsed ? "Settings" : undefined}
          aria-label="Settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={`mb-3 flex items-center rounded-xl py-2.5 text-sm transition-colors ${
            isCollapsed ? "justify-center px-2" : "gap-3 px-3"
          } ${
            pathname.startsWith("/settings")
              ? "bg-green-50 text-green-800"
              : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
          }`}
        >
          <Settings size={19} className="shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </Link>

        {/* Farm reminder */}
        {!isCollapsed && (
          <div className="rounded-xl bg-green-50 p-4">
            <Leaf size={20} className="mb-2 text-green-700" />

            <p className="text-sm font-semibold text-green-900">
              Healthy farm, healthy profits
            </p>

            <p className="mt-1 text-xs leading-5 text-green-800/70">
              Keep your farm records up to date.
            </p>
          </div>
        )}

        {/* Collapse / expand button */}
        <button
          type="button"
          onClick={() => setIsCollapsed((previous) => !previous)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`mt-3 flex w-full items-center rounded-xl py-2.5 text-xs text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 ${
            isCollapsed ? "justify-center px-2" : "gap-3 px-3"
          }`}
        >
          {isCollapsed ? (
            <PanelLeftOpen size={19} />
          ) : (
            <>
              <PanelLeftClose size={19} />
              <span>Collapse sidebar</span>
              <ChevronLeft size={15} className="ml-auto" />
            </>
          )}
        </button>

        {/* Version */}
        {!isCollapsed && (
          <div className="mt-3 px-2 text-center text-xs text-stone-400">
            RabbitFarm v1.0
          </div>
        )}
      </div>
    </aside>
  );
}
