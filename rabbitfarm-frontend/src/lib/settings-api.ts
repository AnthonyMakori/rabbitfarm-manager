
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export interface FarmSettings {
  id?: number;
  farm_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string;
  logo_path?: string | null;
  currency: string;
  timezone: string;
  date_format: string;
  created_at?: string;
  updated_at?: string;
}

interface SettingsResponse {
  message: string;
  data: FarmSettings;
}

const defaultSettings: FarmSettings = {
  farm_name: "RabbitFarm Manager",
  phone: "",
  email: "",
  address: "",
  city: "",
  country: "Kenya",
  currency: "KES",
  timezone: "Africa/Nairobi",
  date_format: "Y-m-d",
};

async function requestSettings(
  method: "GET" | "PUT",
  settings?: FarmSettings,
): Promise<FarmSettings> {
  const response = await fetch(`${API_BASE_URL}/settings/farm`, {
    method,
    headers: {
      Accept: "application/json",
      ...(settings ? { "Content-Type": "application/json" } : {}),
    },
    ...(settings ? { body: JSON.stringify(settings) } : {}),
    cache: "no-store",
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const validationErrors = result?.errors
      ? Object.values(result.errors).flat().join(" ")
      : "";

    throw new Error(
      validationErrors ||
        result?.message ||
        `Unable to ${method === "GET" ? "load" : "save"} farm settings.`,
    );
  }

  return (result as SettingsResponse).data;
}

export async function getFarmSettings(): Promise<FarmSettings> {
  return requestSettings("GET").then((settings) => ({
    ...defaultSettings,
    ...settings,
  }));
}

export async function updateFarmSettings(
  settings: FarmSettings,
): Promise<FarmSettings> {
  return requestSettings("PUT", settings);
}
