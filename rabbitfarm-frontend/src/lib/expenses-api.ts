const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

export const EXPENSE_CATEGORIES = [
  "feed",
  "veterinary",
  "medicine",
  "housing",
  "equipment",
  "labor",
  "transport",
  "utilities",
  "breeding",
  "other",
] as const;

export const PAYMENT_METHODS = [
  "cash",
  "mpesa",
  "bank_transfer",
  "cheque",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpensePaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Expense {
  id: number;
  category: ExpenseCategory;
  description: string;
  amount: number | string;
  expense_date: string;
  paid_to?: string | null;
  payment_method: ExpensePaymentMethod;
  reference?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseInput {
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  paid_to?: string;
  payment_method: ExpensePaymentMethod;
  reference?: string;
  notes?: string;
}

export interface ExpenseFilters {
  search?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
}

interface ExpenseListResponse {
  data: Expense[];
  current_page?: number;
  last_page?: number;
  total?: number;
}

interface ExpenseResponse {
  message?: string;
  data: Expense;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errors = payload?.errors
      ? Object.values(payload.errors).flat().join(" ")
      : "";

    throw new Error(
      errors || payload?.message || `Request failed (${response.status})`,
    );
  }

  return payload as T;
}

function buildQuery(filters: ExpenseFilters = {}): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getExpenses(
  filters: ExpenseFilters = {},
): Promise<ExpenseListResponse> {
  return apiRequest<ExpenseListResponse>(
    `/expenses${buildQuery({ per_page: 100, ...filters })}`,
  );
}

export async function createExpense(
  input: ExpenseInput,
): Promise<Expense> {
  const response = await apiRequest<ExpenseResponse>("/expenses", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function updateExpense(
  id: number,
  input: Partial<ExpenseInput>,
): Promise<Expense> {
  const response = await apiRequest<ExpenseResponse>(`/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function deleteExpense(id: number): Promise<void> {
  await apiRequest<{ message: string }>(`/expenses/${id}`, {
    method: "DELETE",
  });
}