const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

export interface SaleCustomer {
  id: number;
  name: string;
  customer_code?: string;
  is_active: boolean;
}

export interface SaleRabbit {
  id: number;
  rabbit_code: string | null;
  name: string | null;
  breed: string;
  sex: string;
  status: string;
  weight_kg?: number | string | null;
}

export interface SalePayment {
  id: number;
  amount: number | string;
  payment_method: string;
  reference?: string | null;
  paid_at: string;
  notes?: string | null;
}

export interface SaleItem {
  id: number;
  rabbit_id: number;
  unit_price: number | string;
  line_total: number | string;
  rabbit?: SaleRabbit | null;
}

export interface Sale {
  id: number;
  sale_number: string;
  customer_id: number;
  customer?: SaleCustomer;
  sale_date: string;
  total_amount: number | string;
  amount_paid: number | string;
  payment_status: "unpaid" | "partial" | "paid";
  status: string;
  notes?: string | null;
  items: SaleItem[];
  payments: SalePayment[];
}

export interface CreateSaleInput {
  customer_id: number;
  sale_date: string;
  notes?: string;
  items: {
    rabbit_id: number;
    unit_price: number;
  }[];
}

export interface CreatePaymentInput {
  amount: number;
  payment_method: "cash" | "mpesa" | "bank_transfer" | "cheque" | "other";
  reference?: string;
  paid_at?: string;
  notes?: string;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const validationErrors = payload?.errors
      ? Object.values(payload.errors).flat().join(" ")
      : "";

    throw new Error(
      validationErrors ||
        payload?.message ||
        `Request failed with status ${response.status}`,
    );
  }

  return payload as T;
}

/**
 * Supports both ordinary arrays and Laravel paginated responses.
 */
function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const object = payload as Record<string, unknown>;

    if (Array.isArray(object.data)) {
      return object.data as T[];
    }

    if (object.data && typeof object.data === "object") {
      const nested = object.data as Record<string, unknown>;

      if (Array.isArray(nested.data)) {
        return nested.data as T[];
      }
    }
  }

  return [];
}

export async function getSaleCustomers(): Promise<SaleCustomer[]> {
  const result = await apiRequest<unknown>("/customers?per_page=100");
  return extractList<SaleCustomer>(result);
}

export async function getSaleRabbits(): Promise<SaleRabbit[]> {
  const result = await apiRequest<unknown>("/rabbits?per_page=100");
  return extractList<SaleRabbit>(result);
}

export async function getSales(): Promise<Sale[]> {
  const result = await apiRequest<unknown>("/sales?per_page=100");
  return extractList<Sale>(result);
}

export async function createSale(
  input: CreateSaleInput,
): Promise<Sale> {
  const result = await apiRequest<{ data: Sale }>("/sales", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return result.data;
}

export async function recordSalePayment(
  saleId: number,
  input: CreatePaymentInput,
): Promise<SalePayment> {
  const result = await apiRequest<{ data: SalePayment }>(
    `/sales/${saleId}/payments`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return result.data;
}