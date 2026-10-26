
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export interface DashboardStats {
  total_rabbits: number;
  breeding_does: number;
  breeding_bucks: number;
  growing_rabbits: number;
  kits: number;
  feed_items: number;
  sales_count: number;
  sales_total: number;
  sales_paid: number;
  sales_outstanding: number;
  expenses_total: number;
  low_stock_count: number;
  active_customers: number;
}

export interface PopulationItem {
  key: string;
  label: string;
  count: number;
}

export interface DashboardReminder {
  key: string;
  title: string;
  description: string;
  count: number;
  href: string;
}

export interface LowStockItem {
  id: number;
  item_code: string;
  name: string;
  category: string;
  quantity_on_hand: number | string;
  reorder_level: number | string;
  unit: string;
}

export interface RecentActivityItem {
  id: string;
  type: "rabbit" | "sale" | "kindling" | "expense";
  title: string;
  detail: string;
  date: string | null;
  href: string;
}

export interface DashboardOverview {
  generated_at: string;
  stats: DashboardStats;
  population: PopulationItem[];
  reminders: DashboardReminder[];
  low_stock_items: LowStockItem[];
  recent_activities: RecentActivityItem[];
  period: {
    start: string;
    end: string;
    label: string;
  };
}

interface DashboardResponse {
  data: DashboardOverview;
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const response = await fetch(`${API_BASE_URL}/dashboard/overview`, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || "Unable to load dashboard information.",
    );
  }

  if (!result?.data?.stats) {
    throw new Error("The dashboard API returned an unexpected response.");
  }

  return result.data as DashboardOverview;
}
