
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

// Matches the Laravel housing_units table and API response.
export type HousingUnitType = "hutch" | "cage" | "pen" | "colony";

export type HousingUnitStatus = "active" | "maintenance" | "inactive";

export type HousingMovementReason =
  | "initial_assignment"
  | "transfer"
  | "health"
  | "cleaning"
  | "weaning"
  | "other";

export interface HousingRabbit {
  id: number;
  rabbit_code: string;
  name: string | null;
  housing_unit_id?: number | null;
  sex?: string | null;
  breed?: string | null;
}

export interface HousingUnit {
  id: number;
  unit_code: string;
  name: string | null;
  unit_type: HousingUnitType;
  location: string | null;
  capacity: number;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  status: HousingUnitStatus;
  notes: string | null;
  rabbits_count?: number;
  rabbits?: HousingRabbit[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResult<T> {
  current_page: number;
  data: T[];
  first_page_url: string | null;
  from: number | null;
  last_page: number;
  last_page_url: string | null;
  next_page_url: string | null;
  prev_page_url: string | null;
  per_page: number;
  to: number | null;
  total: number;
}

export interface HousingMovement {
  id: number;
  rabbit_id: number;
  from_housing_unit_id: number | null;
  to_housing_unit_id: number | null;
  moved_at: string;
  reason: HousingMovementReason;
  notes: string | null;
  rabbit?: HousingRabbit;
  from_housing_unit?: HousingUnit | null;
  to_housing_unit?: HousingUnit | null;
  created_at: string;
  updated_at: string;
}

export interface HousingUnitInput {
  unit_code: string;
  name?: string | null;
  unit_type: HousingUnitType;
  location?: string | null;
  capacity: number;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  status?: HousingUnitStatus;
  notes?: string | null;
}

interface ApiMessage<T> {
  message: string;
  data: T;
}

export interface HousingFilters {
  search?: string;
  unit_type?: HousingUnitType | "";
  status?: HousingUnitStatus | "";
  page?: number;
  per_page?: number;
}

export interface AssignRabbitInput {
  rabbit_id: number;
  to_housing_unit_id: number;
  reason?: HousingMovementReason;
  notes?: string;
  moved_at?: string;
}

export interface UnassignRabbitInput {
  reason?: Exclude<HousingMovementReason, "initial_assignment">;
  notes?: string;
  moved_at?: string;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    const validationErrors = errorData?.errors
      ? Object.values(errorData.errors).flat().join(" ")
      : "";

    throw new Error(
      validationErrors ||
        errorData?.message ||
        `Request failed with status ${response.status}.`,
    );
  }

  return response.json() as Promise<T>;
}

function toQueryString(filters: HousingFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.unit_type) {
    params.set("unit_type", filters.unit_type);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.page) {
    params.set("page", String(filters.page));
  }

  if (filters.per_page) {
    params.set("per_page", String(filters.per_page));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

// List housing units with optional search, status, and type filters.
export function getHousingUnits(
  filters: HousingFilters = {},
): Promise<PaginatedResult<HousingUnit>> {
  return apiRequest(`/housing-units${toQueryString(filters)}`);
}

// Fetch one housing unit and its current occupants.
export async function getHousingUnit(id: number): Promise<HousingUnit> {
  const response = await apiRequest<{ data: HousingUnit }>(
    `/housing-units/${id}`,
  );

  return response.data;
}

// Create a new housing unit.
export function createHousingUnit(
  input: HousingUnitInput,
): Promise<ApiMessage<HousingUnit>> {
  return apiRequest("/housing-units", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Update an existing housing unit.
export function updateHousingUnit(
  id: number,
  input: Partial<HousingUnitInput>,
): Promise<ApiMessage<HousingUnit>> {
  return apiRequest(`/housing-units/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// Delete a housing unit. Laravel rejects deletion if rabbits occupy it.
export function deleteHousingUnit(id: number): Promise<{ message: string }> {
  return apiRequest(`/housing-units/${id}`, {
    method: "DELETE",
  });
}

// Assign a rabbit to a unit or transfer it from its current unit.
export function assignRabbitToHousing(
  input: AssignRabbitInput,
): Promise<ApiMessage<HousingMovement>> {
  return apiRequest("/housing-movements", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Remove a rabbit's current housing assignment.
export function unassignRabbitFromHousing(
  rabbitId: number,
  input: UnassignRabbitInput = {},
): Promise<ApiMessage<HousingMovement>> {
  return apiRequest(`/rabbits/${rabbitId}/unassign-housing`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Fetch movement history, optionally filtered by rabbit or housing unit.
export function getHousingMovements(filters: {
  rabbit_id?: number;
  housing_unit_id?: number;
  page?: number;
  per_page?: number;
} = {}): Promise<PaginatedResult<HousingMovement>> {
  const params = new URLSearchParams();

  if (filters.rabbit_id) {
    params.set("rabbit_id", String(filters.rabbit_id));
  }

  if (filters.housing_unit_id) {
    params.set("housing_unit_id", String(filters.housing_unit_id));
  }

  if (filters.page) {
    params.set("page", String(filters.page));
  }

  if (filters.per_page) {
    params.set("per_page", String(filters.per_page));
  }

  const query = params.toString();

  return apiRequest(`/housing-movements${query ? `?${query}` : ""}`);
}
