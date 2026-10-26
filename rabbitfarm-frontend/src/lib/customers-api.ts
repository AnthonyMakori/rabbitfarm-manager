
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export type CustomerType = "individual" | "business";

export interface Customer {
  id: number;
  customer_code: string;
  name: string;
  phone: string | null;
  email: string | null;
  customer_type: CustomerType;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  customer_type: CustomerType;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

interface LaravelPaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

interface LaravelSingleResponse<T> {
  message?: string;
  data: T;
}

export interface CustomerFilters {
  search?: string;
  is_active?: boolean;
  per_page?: number;
  page?: number;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const validationErrors = result?.errors
      ? Object.values(result.errors).flat().join(" ")
      : "";

    throw new Error(
      validationErrors ||
        result?.message ||
        `Request failed with status ${response.status}`,
    );
  }

  return result as T;
}

export async function getCustomers(
  filters: CustomerFilters = {},
): Promise<LaravelPaginatedResponse<Customer>> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.is_active !== undefined) {
    params.set("is_active", filters.is_active ? "1" : "0");
  }

  params.set("per_page", String(filters.per_page ?? 100));
  params.set("page", String(filters.page ?? 1));

  return apiRequest<LaravelPaginatedResponse<Customer>>(
    `/customers?${params.toString()}`,
  );
}

export async function createCustomer(
  input: CustomerInput,
): Promise<Customer> {
  const response = await apiRequest<LaravelSingleResponse<Customer>>(
    "/customers",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return response.data;
}

export async function updateCustomer(
  id: number,
  input: Partial<CustomerInput>,
): Promise<Customer> {
  const response = await apiRequest<LaravelSingleResponse<Customer>>(
    `/customers/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return response.data;
}

export async function deactivateCustomer(id: number): Promise<void> {
  await apiRequest<{ message: string }>(`/customers/${id}`, {
    method: "DELETE",
  });
}
