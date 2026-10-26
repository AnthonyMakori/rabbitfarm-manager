
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

export type InventoryCategory =
  | "feed"
  | "medicine"
  | "cleaning"
  | "equipment"
  | "supplies";

export type MovementType =
  | "received"
  | "consumed"
  | "damaged"
  | "adjustment_in"
  | "adjustment_out";

export interface InventoryItem {
  id: number;
  item_code: string;
  name: string;
  category: string;
  unit: string;
  quantity_on_hand: string | number;
  reorder_level: string | number;
  unit_cost: string | number;
  supplier: string | null;
  storage_location: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: number;
  inventory_item_id: number;
  movement_type: MovementType;
  quantity: string | number;
  unit_cost: string | number | null;
  moved_at: string;
  reference: string | null;
  notes: string | null;
  inventory_item?: Pick<
    InventoryItem,
    "id" | "item_code" | "name" | "unit" | "quantity_on_hand"
  >;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface InventoryItemInput {
  item_code: string;
  name: string;
  category: string;
  unit: string;
  reorder_level: number;
  unit_cost: number;
  supplier?: string | null;
  storage_location?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface InventoryMovementInput {
  inventory_item_id: number;
  movement_type: MovementType;
  quantity: number;
  unit_cost?: number | null;
  moved_at?: string;
  reference?: string | null;
  notes?: string | null;
}

interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    const validationMessages = errorBody?.errors
      ? Object.values(errorBody.errors).flat().join(" ")
      : "";

    throw new Error(
      validationMessages ||
        errorBody?.message ||
        `Request failed with status ${response.status}.`
    );
  }

  return body as T;
}

export async function getInventoryItems(filters: {
  search?: string;
  category?: string;
  is_active?: boolean;
  low_stock?: boolean;
  page?: number;
  per_page?: number;
} = {}): Promise<PaginatedResponse<InventoryItem>> {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);

  if (filters.is_active !== undefined) {
    params.set("is_active", String(filters.is_active));
  }

  if (filters.low_stock !== undefined) {
    params.set("low_stock", String(filters.low_stock));
  }

  if (filters.page) params.set("page", String(filters.page));
  if (filters.per_page) params.set("per_page", String(filters.per_page));

  const query = params.toString();

  return apiRequest<PaginatedResponse<InventoryItem>>(
    `/inventory-items${query ? `?${query}` : ""}`
  );
}

export async function getInventoryItem(
  id: number
): Promise<{ data: InventoryItem & { movements?: InventoryMovement[] } }> {
  return apiRequest(`/inventory-items/${id}`);
}

export async function createInventoryItem(
  input: InventoryItemInput
): Promise<{ message: string; data: InventoryItem }> {
  return apiRequest("/inventory-items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateInventoryItem(
  id: number,
  input: Partial<InventoryItemInput>
): Promise<{ message: string; data: InventoryItem }> {
  return apiRequest(`/inventory-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteInventoryItem(
  id: number
): Promise<{ message: string }> {
  return apiRequest(`/inventory-items/${id}`, {
    method: "DELETE",
  });
}

export async function getInventoryMovements(filters: {
  inventory_item_id?: number;
  movement_type?: MovementType;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
} = {}): Promise<PaginatedResponse<InventoryMovement>> {
  const params = new URLSearchParams();

  if (filters.inventory_item_id) {
    params.set("inventory_item_id", String(filters.inventory_item_id));
  }

  if (filters.movement_type) {
    params.set("movement_type", filters.movement_type);
  }

  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.per_page) params.set("per_page", String(filters.per_page));

  const query = params.toString();

  return apiRequest<PaginatedResponse<InventoryMovement>>(
    `/inventory-movements${query ? `?${query}` : ""}`
  );
}

export async function createInventoryMovement(
  input: InventoryMovementInput
): Promise<{ message: string; data: InventoryMovement }> {
  return apiRequest("/inventory-movements", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
