const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export interface ReportBreakdown {
  status?: string;
  category?: string;
  breed?: string;
  sex?: string;
  payment_status?: string;
  payment_method?: string;
  total?: number | string;
  total_sales?: number | string;
  total_amount?: number | string;
  expense_count?: number | string;
  item_count?: number | string;
  quantity?: number | string;
}

export interface LowStockItem {
  id: number;
  item_code: string;
  name: string;
  category: string;
  unit: string;
  quantity_on_hand: number | string;
  reorder_level: number | string;
}

export interface ReportsOverview {
  filters: {
    start_date: string | null;
    end_date: string | null;
  };
  farm: {
    total_rabbits: number;
    active_rabbits: number;
    rabbits_by_status: ReportBreakdown[];
    rabbits_by_category: ReportBreakdown[];
    rabbits_by_sex: ReportBreakdown[];
    rabbits_by_breed: ReportBreakdown[];
  };
  sales: {
    total_sales: number;
    sales_value: number;
    payments_recorded_on_sales: number;
    payments_received_in_period: number;
    payment_transactions: number;
    outstanding_balance: number;
    rabbits_sold: number;
    by_payment_status: ReportBreakdown[];
  };
  expenses: {
    total_expense_records: number;
    total_expenses: number;
    by_category: ReportBreakdown[];
    by_payment_method: ReportBreakdown[];
  };
  operating_summary: {
    sales_value: number;
    total_expenses: number;
    preliminary_operating_surplus: number;
    note: string;
  };
  breeding: {
    total_breedings: number;
    completed_breedings: number;
    confirmed_pregnancies: number;
    negative_pregnancy_assessments: number;
    by_status: ReportBreakdown[];
  };
  kindlings: {
    total_kindlings: number;
    total_kits_born: number;
    kits_born_alive: number;
    stillborn_kits: number;
    current_alive_kits: number;
    kits_weaned: number;
  };
  inventory: {
    active_items: number;
    total_quantity: number;
    estimated_stock_value: number;
    low_stock_items: number;
    low_stock_list: LowStockItem[];
    by_category: ReportBreakdown[];
  };
  customers: {
    total_customers: number;
    active_customers: number;
  };
}

export async function getReportsOverview(
  startDate?: string,
  endDate?: string,
): Promise<ReportsOverview> {
  const params = new URLSearchParams();

  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);

  const query = params.toString();
  const url = `${API_BASE_URL}/reports/overview${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Failed to load reports (${response.status}).`;

    try {
      const body = await response.json();
      if (body?.message) message = body.message;
      if (body?.errors) {
        message = Object.values(body.errors).flat().join(" ");
      }
    } catch {
      // Keep the original HTTP error message if the body isn't JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<ReportsOverview>;
}