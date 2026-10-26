const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

// Base server origin, used to build full rabbit photo URLs.
const API_ORIGIN = new URL(API_BASE_URL).origin;

// Rabbit categories.
export type RabbitCategory = "breeding" | "growing" | "kit";

// Rabbit sex.
export type RabbitSex = "male" | "female";

// Rabbit status.
export type RabbitStatus =
  | "active"
  | "sold"
  | "deceased"
  | "culled"
  | "transferred";

// How the rabbit joined the farm.
export type AcquisitionSource =
  | "born_on_farm"
  | "purchased"
  | "transferred";

// A rabbit returned by the Laravel API.
export interface Rabbit {
  id: number;
  rabbit_code: string | null;
  name: string | null;
  breed: string;
  sex: RabbitSex;
  date_of_birth: string | null;
  weight_kg: string | number | null;
  category: RabbitCategory;
  status: RabbitStatus;
  acquisition_source: AcquisitionSource;
  acquisition_cost: string | number | null;
  acquired_at: string | null;
  exit_date: string | null;
  notes: string | null;
  housing_unit_id?: number | null;

  // Photo information returned by Laravel.
  image_path: string | null;
  image_url: string | null;

  created_at: string;
  updated_at: string;
}

// Data submitted when registering or updating a rabbit.
export interface RabbitInput {
  name?: string | null;
  breed: string;
  sex: RabbitSex;
  date_of_birth?: string | null;
  weight_kg?: number | null;
  category: RabbitCategory;
  status?: RabbitStatus;
  acquisition_source: AcquisitionSource;
  acquisition_cost?: number | null;
  acquired_at?: string | null;
  exit_date?: string | null;
  notes?: string | null;

  // Optional photo selected from the user's computer.
  image?: File | null;
}


export type RabbitEventType =
  | "weight"
  | "vaccination"
  | "medication"
  | "breeding"
  | "birth"
  | "illness"
  | "treatment"
  | "sale"
  | "other";

export interface RabbitEvent {
  id: number;
  rabbit_id: number;
  event_type: RabbitEventType;
  title: string;
  event_date: string;
  description: string | null;
  weight_kg: string | number | null;
  cost: string | number | null;
  next_due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface RabbitEventInput {
  event_type: RabbitEventType;
  title: string;
  event_date: string;
  description?: string | null;
  weight_kg?: number | null;
  cost?: number | null;
  next_due_date?: string | null;
}

// Retrieve paginated history for one rabbit.
export async function getRabbitEvents(
  rabbitId: number,
  page = 1,
): Promise<PaginatedResponse<RabbitEvent>> {
  const response = await fetch(
    `${API_BASE_URL}/rabbits/${rabbitId}/events?page=${page}`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to load rabbit history.");
  }

  return response.json();
}

// Save a new history event.
export async function createRabbitEvent(
  rabbitId: number,
  input: RabbitEventInput,
): Promise<RabbitEvent> {
  const response = await fetch(
    `${API_BASE_URL}/rabbits/${rabbitId}/events`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    return handleApiError(
      response,
      "Unable to record rabbit history.",
    );
  }

  const result = (await response.json()) as ApiMessage<RabbitEvent>;
  return result.data;
}


export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
}

interface ApiMessage<T> {
  message: string;
  data: T;
}

// Shared error handler for Laravel validation errors.
async function handleApiError(
  response: Response,
  fallbackMessage: string,
): Promise<never> {
  const result = await response.json().catch(() => ({}));

  if (response.status === 422 && result.errors) {
    const messages = Object.values(
      result.errors as Record<string, string[]>,
    )
      .flat()
      .join("\n");

    throw new Error(messages || "Please check the form.");
  }

  throw new Error(result.message || fallbackMessage);
}

// Retrieve the rabbit registry.
export async function getRabbits(
  search = "",
  page = 1,
): Promise<PaginatedResponse<Rabbit>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: "10",
  });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const response = await fetch(
    `${API_BASE_URL}/rabbits?${params.toString()}`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to load rabbits from the server.");
  }

  return response.json();
}

// Retrieve one rabbit for its detail page.
export async function getRabbit(id: number): Promise<Rabbit> {
  const response = await fetch(`${API_BASE_URL}/rabbits/${id}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Rabbit record not found.");
    }

    throw new Error("Unable to load rabbit details.");
  }

  const result = (await response.json()) as { data: Rabbit };
  return result.data;
}

// Convert Laravel's photo URL into an absolute URL for the browser.
export function getRabbitImageUrl(rabbit: Rabbit): string | null {
  if (!rabbit.image_url) {
    return null;
  }

  return new URL(rabbit.image_url, API_ORIGIN).toString();
}

// Register a rabbit, optionally including its photograph.
// FormData allows Laravel to receive both normal fields and an uploaded file.
export async function createRabbit(input: RabbitInput): Promise<Rabbit> {
  const formData = new FormData();

  Object.entries(input).forEach(([key, value]) => {
    // Handle the file separately and skip empty optional values.
    if (
      key === "image" ||
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    formData.append(key, String(value));
  });

  if (input.image) {
    formData.append("image", input.image);
  }

  const response = await fetch(`${API_BASE_URL}/rabbits`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      // Do not set Content-Type manually.
      // The browser adds the multipart/form-data boundary.
    },
    body: formData,
  });

  if (!response.ok) {
    return handleApiError(response, "Unable to register rabbit.");
  }

  const result = (await response.json()) as ApiMessage<Rabbit>;
  return result.data;
}

// Update an existing rabbit's ordinary fields.
// This version sends JSON; photo replacement will need multipart handling.

export async function updateRabbit(
  id: number,
  input: Partial<RabbitInput>,
): Promise<Rabbit> {
  const formData = new FormData();

  Object.entries(input).forEach(([key, value]) => {
    if (key === "image" || value === undefined) {
      return;
    }

    // Empty strings allow users to clear optional fields.
    // Laravel converts empty strings to null for nullable fields.
    formData.append(
      key,
      value === null ? "" : String(value),
    );
  });

  // Attach a replacement photograph only when one was selected.
  if (input.image) {
    formData.append("image", input.image);
  }

  const response = await fetch(`${API_BASE_URL}/rabbits/${id}`, {
    // Laravel method spoofing makes multipart file uploads work
    // reliably with an update route.
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    body: (() => {
      formData.append("_method", "PUT");
      return formData;
    })(),
  });

  if (!response.ok) {
    return handleApiError(response, "Unable to update rabbit.");
  }

  const result = (await response.json()) as ApiMessage<Rabbit>;
  return result.data;
}




/* --------------------------------------------------------------------------
 * Breeding management
 * -------------------------------------------------------------------------- */

export type BreedingStatus =
  | "planned"
  | "mated"
  | "pregnant"
  | "kindled"
  | "unsuccessful"
  | "cancelled";

export type PregnancyStatus =
  | "unknown"
  | "suspected"
  | "confirmed"
  | "not_pregnant";

export interface Breeding {
  id: number;
  male_rabbit_id: number;
  female_rabbit_id: number;
  mating_date: string;
  expected_kindling_date: string | null;
  actual_kindling_date: string | null;
  pregnancy_status: PregnancyStatus;
  status: BreedingStatus;
  notes: string | null;
  male_rabbit?: Rabbit;
  female_rabbit?: Rabbit;
  created_at: string;
  updated_at: string;
}

export interface BreedingInput {
  male_rabbit_id: number;
  female_rabbit_id: number;
  mating_date: string;
  expected_kindling_date?: string | null;
  actual_kindling_date?: string | null;
  pregnancy_status?: PregnancyStatus;
  status?: BreedingStatus;
  notes?: string | null;
}

// The Laravel index endpoint returns the paginator directly.
export async function getBreedings(
  page = 1
): Promise<PaginatedResponse<Breeding>> {
  const response = await fetch(
    `${API_BASE_URL}/breedings?page=${page}`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return handleApiError(response, "Unable to load breeding records.");
  }

  return response.json();
}

export async function createBreeding(
  input: BreedingInput
): Promise<Breeding> {
  const response = await fetch(`${API_BASE_URL}/breedings`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return handleApiError(response, "Unable to register breeding.");
  }

  const result = (await response.json()) as ApiMessage<Breeding>;
  return result.data;
}

export async function getBreeding(id: number): Promise<Breeding> {
  const response = await fetch(`${API_BASE_URL}/breedings/${id}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return handleApiError(response, "Unable to load breeding record.");
  }

  const result = (await response.json()) as ApiMessage<Breeding>;
  return result.data;
}

export async function updateBreeding(
  id: number,
  input: Partial<BreedingInput>
): Promise<Breeding> {
  const response = await fetch(`${API_BASE_URL}/breedings/${id}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return handleApiError(response, "Unable to update breeding record.");
  }

  const result = (await response.json()) as ApiMessage<Breeding>;
  return result.data;
}

export async function deleteBreeding(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/breedings/${id}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return handleApiError(response, "Unable to delete breeding record.");
  }
}


/* --------------------------------------------------------------------------
 * Kindling and litter management
 * -------------------------------------------------------------------------- */

export interface Kindling {
  id: number;
  breeding_id: number;
  kindling_date: string;
  total_born: number;
  born_alive: number;
  stillborn: number;
  current_alive: number | null;
  weaned_count: number;
  weaning_date: string | null;
  notes: string | null;
  breeding?: Breeding;
  created_at: string;
  updated_at: string;
}

export interface KindlingInput {
  breeding_id?: number;
  kindling_date: string;
  total_born: number;
  born_alive: number;
  stillborn: number;
  current_alive?: number | null;
  weaned_count: number;
  weaning_date?: string | null;
  notes?: string | null;
}

export async function getKindlings(
  page = 1
): Promise<PaginatedResponse<Kindling>> {
  const response = await fetch(
    `${API_BASE_URL}/kindlings?page=${page}`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return handleApiError(response, "Unable to load kindling records.");
  }

  return response.json();
}

export async function createKindling(
  input: KindlingInput
): Promise<Kindling> {
  const response = await fetch(`${API_BASE_URL}/kindlings`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return handleApiError(response, "Unable to save kindling record.");
  }

  const result = (await response.json()) as ApiMessage<Kindling>;
  return result.data;
}

export async function updateKindling(
  id: number,
  input: Partial<KindlingInput>
): Promise<Kindling> {
  const response = await fetch(`${API_BASE_URL}/kindlings/${id}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return handleApiError(response, "Unable to update kindling record.");
  }

  const result = (await response.json()) as ApiMessage<Kindling>;
  return result.data;
}

export async function deleteKindling(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/kindlings/${id}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return handleApiError(response, "Unable to delete kindling record.");
  }
}

/* --------------------------------------------------------------------------
 * Health and veterinary management
 * -------------------------------------------------------------------------- */

export type HealthCategory =
  | "checkup"
  | "illness"
  | "vaccination"
  | "treatment"
  | "injury"
  | "surgery"
  | "parasite_control"
  | "other";

export type HealthRecordStatus =
  | "completed"
  | "ongoing"
  | "follow_up";

export interface HealthRecord {
  id: number;
  rabbit_id: number;
  record_date: string;
  category: HealthCategory;
  title: string;
  diagnosis: string | null;
  symptoms: string | null;
  treatment: string | null;
  medication: string | null;
  dosage: string | null;
  administered_by: string | null;
  next_due_date: string | null;
  cost: string | number | null;
  status: HealthRecordStatus;
  notes: string | null;
  rabbit?: Rabbit;
  created_at: string;
  updated_at: string;
}

export interface HealthRecordInput {
  rabbit_id: number;
  record_date: string;
  category: HealthCategory;
  title: string;
  diagnosis?: string | null;
  symptoms?: string | null;
  treatment?: string | null;
  medication?: string | null;
  dosage?: string | null;
  administered_by?: string | null;
  next_due_date?: string | null;
  cost?: number | null;
  status: HealthRecordStatus;
  notes?: string | null;
}

export interface HealthRecordFilters {
  rabbit_id?: number;
  category?: HealthCategory | "";
  status?: HealthRecordStatus | "";
  search?: string;
}

/**
 * Fetch paginated health records with optional filters.
 */
export async function getHealthRecords(
  page = 1,
  filters: HealthRecordFilters = {},
): Promise<PaginatedResponse<HealthRecord>> {
  const params = new URLSearchParams({
    page: String(page),
  });

  if (filters.rabbit_id) {
    params.set("rabbit_id", String(filters.rabbit_id));
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  const response = await fetch(
    `${API_BASE_URL}/health-records?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    await handleApiError(
      response,
      "Failed to load health records.",
    );
  }

  return response.json();
}

/**
 * Create a health record.
 */
export async function createHealthRecord(
  input: HealthRecordInput,
): Promise<HealthRecord> {
  const response = await fetch(
    `${API_BASE_URL}/health-records`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    await handleApiError(
      response,
      "Failed to create health record.",
    );
  }

  const result: ApiMessage<HealthRecord> = await response.json();

  return result.data;
}

/**
 * Update a health record.
 */
export async function updateHealthRecord(
  id: number,
  input: Partial<HealthRecordInput>,
): Promise<HealthRecord> {
  const response = await fetch(
    `${API_BASE_URL}/health-records/${id}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    await handleApiError(
      response,
      "Failed to update health record.",
    );
  }

  const result: ApiMessage<HealthRecord> = await response.json();

  return result.data;
}

/**
 * Delete a health record.
 */
export async function deleteHealthRecord(
  id: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/health-records/${id}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    await handleApiError(
      response,
      "Failed to delete health record.",
    );
  }
}
