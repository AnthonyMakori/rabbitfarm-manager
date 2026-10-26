
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  Save,
  Settings2,
  ShieldCheck,
  Tractor,
  Wallet,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import {
  type FarmSettings,
  getFarmSettings,
  updateFarmSettings,
} from "@/lib/settings-api";


const initialSettings: FarmSettings = {
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

const inputClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100";

const labelClass = "text-sm font-medium text-gray-700";

export default function SettingsPage() {
  const [settings, setSettings] =
    useState<FarmSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await getFarmSettings();
      setSettings({ ...initialSettings, ...data });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load farm settings. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function updateField<K extends keyof FarmSettings>(
    field: K,
    value: FarmSettings[K],
  ) {
    setSettings((current) => ({ ...current, [field]: value }));
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const saved = await updateFarmSettings(settings);
      setSettings({ ...initialSettings, ...saved });
      setSuccess("Your farm settings have been saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save settings. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      <div className="min-w-0 flex-1 lg:ml-64">
        <AppHeader />

        <main className="mx-auto max-w-9xl p-4 sm:p-6 lg:p-8">
          {/* Page heading */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                <Settings2 size={16} />
                <span>Administration</span>
                <span>/</span>
                <span className="text-green-700">Settings</span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Farm Settings
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-base">
                Manage your farm profile and regional preferences
                from one place.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-xl border border-green-100 bg-green-50 px-4 py-3">
              <ShieldCheck className="text-green-700" size={20} />
              <div>
                <p className="text-sm font-semibold text-green-900">
                  Farm configuration
                </p>
                <p className="text-xs text-green-700">
                  Settings saved to your database
                </p>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 shrink-0" size={19} />
              <div className="flex-1">{error}</div>
              <button
                type="button"
                onClick={() => void loadSettings()}
                className="shrink-0 font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              <CheckCircle2 size={19} className="shrink-0" />
              {success}
            </div>
          )}

          {isLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <LoaderCircle className="animate-spin" size={20} />
                Loading your farm settings...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Farm profile */}
              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-5 sm:px-7">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                    <Tractor size={22} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Farm Profile
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Basic information and contact details for your farm.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
                  <div className="sm:col-span-2">
                    <label htmlFor="farm_name" className={labelClass}>
                      Farm name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="farm_name"
                      name="farm_name"
                      required
                      maxLength={255}
                      value={settings.farm_name}
                      onChange={(e) =>
                        updateField("farm_name", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Enter your farm name"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Phone number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      maxLength={30}
                      value={settings.phone ?? ""}
                      onChange={(e) =>
                        updateField("phone", e.target.value)
                      }
                      className={inputClass}
                      placeholder="e.g. 0712 345 678"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      maxLength={255}
                      value={settings.email ?? ""}
                      onChange={(e) =>
                        updateField("email", e.target.value)
                      }
                      className={inputClass}
                      placeholder="farm@example.com"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="address" className={labelClass}>
                      Physical address
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      rows={3}
                      maxLength={2000}
                      value={settings.address ?? ""}
                      onChange={(e) =>
                        updateField("address", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Enter the farm's physical address"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className={labelClass}>
                      City / Town
                    </label>
                    <input
                      id="city"
                      name="city"
                      maxLength={255}
                      value={settings.city ?? ""}
                      onChange={(e) =>
                        updateField("city", e.target.value)
                      }
                      className={inputClass}
                      placeholder="e.g. Nairobi"
                    />
                  </div>

                  <div>
                    <label htmlFor="country" className={labelClass}>
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="country"
                      name="country"
                      required
                      maxLength={255}
                      value={settings.country}
                      onChange={(e) =>
                        updateField("country", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Enter country"
                    />
                  </div>
                </div>
              </section>

              {/* Regional preferences */}
              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-5 sm:px-7">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Wallet size={22} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Regional Preferences
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Choose how financial amounts, dates and times are
                      configured.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
                  <div>
                    <label htmlFor="currency" className={labelClass}>
                      Currency
                    </label>
                    <select
                      id="currency"
                      name="currency"
                      required
                      value={settings.currency}
                      onChange={(e) =>
                        updateField("currency", e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="KES">KES — Kenyan Shilling</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="GBP">GBP — British Pound</option>
                      <option value="TZS">TZS — Tanzanian Shilling</option>
                      <option value="UGX">UGX — Ugandan Shilling</option>
                    </select>
                    <p className="mt-1.5 text-xs text-gray-500">
                      Select the currency to use for farm reporting preferences.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="timezone" className={labelClass}>
                      Timezone
                    </label>
                    <select
                      id="timezone"
                      name="timezone"
                      required
                      value={settings.timezone}
                      onChange={(e) =>
                        updateField("timezone", e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="Africa/Nairobi">
                        Africa/Nairobi (East Africa)
                      </option>
                      <option value="UTC">UTC</option>
                      <option value="Africa/Dar_es_Salaam">
                        Africa/Dar_es_Salaam
                      </option>
                      <option value="Africa/Kampala">
                        Africa/Kampala
                      </option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="America/New_York">
                        America/New_York
                      </option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="date_format" className={labelClass}>
                      Date format
                    </label>
                    <select
                      id="date_format"
                      name="date_format"
                      required
                      value={settings.date_format}
                      onChange={(e) =>
                        updateField("date_format", e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="Y-m-d">YYYY-MM-DD (2026-10-26)</option>
                      <option value="d/m/Y">DD/MM/YYYY (26/10/2026)</option>
                      <option value="m/d/Y">MM/DD/YYYY (10/26/2026)</option>
                      <option value="d-m-Y">DD-MM-YYYY (26-10-2026)</option>
                    </select>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4">
                    <MapPin
                      className="mt-0.5 shrink-0 text-gray-500"
                      size={19}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Current regional configuration
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {settings.currency} · {settings.timezone}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Date format: {settings.date_format}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Save actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-gray-500">
                  Changes are saved to the farm settings database when you
                  select Save Changes.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSuccess("");
                      void loadSettings();
                    }}
                    disabled={isSaving}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reload saved settings
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? (
                      <LoaderCircle className="animate-spin" size={18} />
                    ) : (
                      <Save size={18} />
                    )}
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
