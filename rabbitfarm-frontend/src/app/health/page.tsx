"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  Edit2,
  HeartPulse,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";

import {
  getHealthRecords,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  getRabbits,
  type HealthRecord,
  type HealthRecordInput,
  type HealthCategory,
  type HealthRecordStatus,
  type HealthRecordFilters,
  type Rabbit,
} from "@/lib/api";

const CATEGORIES: {
  value: HealthCategory;
  label: string;
}[] = [
  { value: "checkup", label: "General checkup" },
  { value: "illness", label: "Illness" },
  { value: "vaccination", label: "Vaccination" },
  { value: "treatment", label: "Treatment" },
  { value: "injury", label: "Injury" },
  { value: "surgery", label: "Surgery" },
  { value: "parasite_control", label: "Parasite control" },
  { value: "other", label: "Other" },
];

const STATUSES: {
  value: HealthRecordStatus;
  label: string;
}[] = [
  { value: "completed", label: "Completed" },
  { value: "ongoing", label: "Ongoing" },
  { value: "follow_up", label: "Follow-up required" },
];

type HealthForm = {
  rabbit_id: string;
  record_date: string;
  category: HealthCategory;
  title: string;
  diagnosis: string;
  symptoms: string;
  treatment: string;
  medication: string;
  dosage: string;
  administered_by: string;
  next_due_date: string;
  cost: string;
  status: HealthRecordStatus;
  notes: string;
};

const EMPTY_FORM: HealthForm = {
  rabbit_id: "",
  record_date: new Date().toISOString().slice(0, 10),
  category: "checkup",
  title: "",
  diagnosis: "",
  symptoms: "",
  treatment: "",
  medication: "",
  dosage: "",
  administered_by: "",
  next_due_date: "",
  cost: "",
  status: "completed",
  notes: "",
};

function formatDate(date: string | null | undefined): string {
  if (!date) return "—";

  // Avoid timezone shifts when formatting date-only API values.
  const dateOnly = date.slice(0, 10);
  const parsed = new Date(`${dateOnly}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "—";
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) return "—";

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

function categoryLabel(category: HealthCategory): string {
  return CATEGORIES.find((item) => item.value === category)?.label
    ?? category;
}

function statusLabel(status: HealthRecordStatus): string {
  return STATUSES.find((item) => item.value === status)?.label
    ?? status;
}

function statusClass(status: HealthRecordStatus): string {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    case "ongoing":
      return "bg-amber-100 text-amber-700";
    case "follow_up":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function rabbitLabel(rabbit: Rabbit): string {
  return `${rabbit.rabbit_code}${rabbit.name ? ` — ${rabbit.name}` : ""}`;
}

function toForm(record: HealthRecord): HealthForm {
  return {
    rabbit_id: String(record.rabbit_id),
    record_date: record.record_date.slice(0, 10),
    category: record.category,
    title: record.title,
    diagnosis: record.diagnosis ?? "",
    symptoms: record.symptoms ?? "",
    treatment: record.treatment ?? "",
    medication: record.medication ?? "",
    dosage: record.dosage ?? "",
    administered_by: record.administered_by ?? "",
    next_due_date: record.next_due_date?.slice(0, 10) ?? "",
    cost:
      record.cost === null || record.cost === undefined
        ? ""
        : String(record.cost),
    status: record.status,
    notes: record.notes ?? "",
  };
}

export default function HealthPage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<HealthRecordFilters>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<HealthRecord | null>(null);
  const [form, setForm] = useState<HealthForm>(EMPTY_FORM);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getHealthRecords(page, filters);

      setRecords(result.data);
      setLastPage(result.last_page);
      setTotalRecords(result.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load health records.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const loadRabbits = useCallback(async () => {
    try {
      // Load all rabbit pages so the form can select any registered rabbit.
      const firstPage = await getRabbits("", 1);
      const allRabbits = [...firstPage.data];

      for (
        let currentPage = 2;
        currentPage <= firstPage.last_page;
        currentPage += 1
      ) {
        const result = await getRabbits("", currentPage);
        allRabbits.push(...result.data);
      }

      setRabbits(allRabbits);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load registered rabbits.",
      );
    }
  }, []);

  useEffect(() => {
    void loadRabbits();
  }, [loadRabbits]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  function openCreateForm() {
    setEditingRecord(null);
    setForm({
      ...EMPTY_FORM,
      record_date: new Date().toISOString().slice(0, 10),
    });
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function openEditForm(record: HealthRecord) {
    setEditingRecord(record);
    setForm(toForm(record));
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setIsModalOpen(false);
    setEditingRecord(null);
    setForm(EMPTY_FORM);
  }

  function updateForm<K extends keyof HealthForm>(
    field: K,
    value: HealthForm[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPage(1);
    setFilters((previous) => ({
      ...previous,
      search: searchInput.trim(),
    }));
  }

  function changeFilter(
    field: "rabbit_id" | "category" | "status",
    value: string,
  ) {
    setPage(1);

    setFilters((previous) => {
      const next = { ...previous };

      if (value === "") {
        delete next[field];
      } else if (field === "rabbit_id") {
        next.rabbit_id = Number(value);
      } else if (field === "category") {
        next.category = value as HealthCategory;
      } else {
        next.status = value as HealthRecordStatus;
      }

      return next;
    });
  }

  function validateForm(): string | null {
    if (!form.rabbit_id) {
      return "Please select a rabbit.";
    }

    if (!form.record_date) {
      return "Please select the record date.";
    }

    if (!form.title.trim()) {
      return "Please enter a title for this health record.";
    }

    if (
      form.next_due_date
      && form.next_due_date < form.record_date
    ) {
      return "The next due date cannot be before the record date.";
    }

    if (form.cost.trim() !== "") {
      const cost = Number(form.cost);

      if (!Number.isFinite(cost) || cost < 0) {
        return "Enter a valid, non-negative cost.";
      }

      if (cost > 99999999.99) {
        return "The cost exceeds the maximum allowed amount.";
      }
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const payload: HealthRecordInput = {
      rabbit_id: Number(form.rabbit_id),
      record_date: form.record_date,
      category: form.category,
      title: form.title.trim(),
      diagnosis: form.diagnosis.trim() || null,
      symptoms: form.symptoms.trim() || null,
      treatment: form.treatment.trim() || null,
      medication: form.medication.trim() || null,
      dosage: form.dosage.trim() || null,
      administered_by: form.administered_by.trim() || null,
      next_due_date: form.next_due_date || null,
      cost: form.cost.trim() === "" ? null : Number(form.cost),
      status: form.status,
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (editingRecord) {
        await updateHealthRecord(editingRecord.id, payload);
        setSuccess("Health record updated successfully.");
      } else {
        await createHealthRecord(payload);
        setSuccess("Health record created successfully.");
      }

      setIsModalOpen(false);
      setEditingRecord(null);
      setForm(EMPTY_FORM);

      // Return to the first page after a new record is created.
      if (!editingRecord) {
        setPage(1);
      } else {
        await loadRecords();
      }

      // A new record is shown after the page/filter state has updated.
      // loadRecords will also run when page changes.
      if (!editingRecord && page === 1) {
        await loadRecords();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the health record.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record: HealthRecord) {
    const confirmed = window.confirm(
      `Delete the health record "${record.title}" for ${
        record.rabbit?.rabbit_code ?? `rabbit #${record.rabbit_id}`
      }?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deleteHealthRecord(record.id);

      setSuccess("Health record deleted successfully.");

      // If the last record on this page is deleted, go back one page.
      if (records.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadRecords();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete the health record.",
      );
    }
  }

  const followUpCount = records.filter(
    (record) => record.status === "follow_up",
  ).length;

  const ongoingCount = records.filter(
    (record) => record.status === "ongoing",
  ).length;

  const dueSoonCount = records.filter((record) => {
    if (!record.next_due_date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(`${record.next_due_date.slice(0, 10)}T00:00:00`);
    const daysUntilDue =
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    return daysUntilDue >= 0 && daysUntilDue <= 30;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />

      <div className="min-w-0 flex-1 lg:ml-64">
        <AppHeader />

        <main className="p-4 sm:p-6 lg:p-8">
          {/* Page heading */}
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                <HeartPulse size={17} />
                <span>Farm operations</span>
                <span>/</span>
                <span>Health</span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Health &amp; Veterinary Management
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Record health events, treatments, vaccinations, and follow-ups
                for your rabbits.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus size={18} />
              Add health record
            </button>
          </div>

          {/* Alerts */}
          {error && !isModalOpen && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <p className="min-w-0 flex-1">{error}</p>

              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
            >
              <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
              <p className="min-w-0 flex-1">{success}</p>

              <button
                type="button"
                onClick={() => setSuccess("")}
                aria-label="Dismiss success message"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* Summary cards */}
          <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">
                  Total records
                </p>
                <ClipboardPlus className="text-emerald-600" size={21} />
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900">
                {totalRecords}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Matching current filters
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">
                  Ongoing cases
                </p>
                <Stethoscope className="text-amber-600" size={21} />
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900">
                {ongoingCount}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                On this page
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">
                  Follow-ups
                </p>
                <CalendarDays className="text-blue-600" size={21} />
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900">
                {followUpCount}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                On this page
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">
                  Due in 30 days
                </p>
                <CalendarDays className="text-purple-600" size={21} />
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900">
                {dueSoonCount}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                On this page
              </p>
            </div>
          </div>

          {/* Filters */}
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <form
              onSubmit={applySearch}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
            >
              <div className="xl:col-span-2">
                <label
                  htmlFor="health-search"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Search records
                </label>

                <div className="flex">
                  <input
                    id="health-search"
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Title, symptoms, medication..."
                    className="min-w-0 flex-1 rounded-l-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                  <button
                    type="submit"
                    aria-label="Search health records"
                    className="inline-flex items-center justify-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-600 hover:bg-gray-100"
                  >
                    <Search size={18} />
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="rabbit-filter"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Rabbit
                </label>

                <select
                  id="rabbit-filter"
                  value={filters.rabbit_id ?? ""}
                  onChange={(event) =>
                    changeFilter("rabbit_id", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">All rabbits</option>
                  {rabbits.map((rabbit) => (
                    <option key={rabbit.id} value={rabbit.id}>
                      {rabbitLabel(rabbit)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="category-filter"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Category
                </label>

                <select
                  id="category-filter"
                  value={filters.category ?? ""}
                  onChange={(event) =>
                    changeFilter("category", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="status-filter"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Status
                </label>

                <select
                  id="status-filter"
                  value={filters.status ?? ""}
                  onChange={(event) =>
                    changeFilter("status", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">All statuses</option>
                  {STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500">
                Showing {records.length} record{records.length === 1 ? "" : "s"}
                {" "}on this page
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setFilters({});
                  setPage(1);
                  setSuccess("");
                  setError("");
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw size={15} />
                Clear filters
              </button>
            </div>
          </section>

          {/* Records table */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Health records
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Medical and veterinary history for your registered rabbits.
                </p>
              </div>

              <span className="text-sm text-gray-500">
                Page {page} of {lastPage}
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-gray-500">
                <LoaderCircle
                  className="animate-spin text-emerald-600"
                  size={30}
                />
                <p className="text-sm">Loading health records...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 rounded-full bg-emerald-50 p-4">
                  <HeartPulse className="text-emerald-600" size={30} />
                </div>

                <h3 className="font-semibold text-gray-900">
                  No health records found
                </h3>

                <p className="mt-2 max-w-md text-sm text-gray-500">
                  Add a health record for a rabbit, or change your search and
                  filters to see other records.
                </p>

                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <Plus size={17} />
                  Add first record
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-5 py-3.5 font-semibold">Date</th>
                        <th className="px-5 py-3.5 font-semibold">Rabbit</th>
                        <th className="px-5 py-3.5 font-semibold">Health event</th>
                        <th className="px-5 py-3.5 font-semibold">Treatment / medication</th>
                        <th className="px-5 py-3.5 font-semibold">Next due</th>
                        <th className="px-5 py-3.5 font-semibold">Cost</th>
                        <th className="px-5 py-3.5 font-semibold">Status</th>
                        <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {records.map((record) => (
                        <tr
                          key={record.id}
                          className="transition hover:bg-gray-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                            {formatDate(record.record_date)}
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-900">
                              {record.rabbit?.rabbit_code
                                ?? `Rabbit #${record.rabbit_id}`}
                            </p>
                            {record.rabbit?.name && (
                              <p className="mt-1 text-xs text-gray-500">
                                {record.rabbit.name}
                              </p>
                            )}
                          </td>

                          <td className="max-w-xs px-5 py-4">
                            <p className="font-semibold text-gray-900">
                              {record.title}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {categoryLabel(record.category)}
                            </p>
                            {record.diagnosis && (
                              <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                {record.diagnosis}
                              </p>
                            )}
                          </td>

                          <td className="max-w-xs px-5 py-4">
                            <p className="text-gray-700">
                              {record.treatment || "—"}
                            </p>
                            {record.medication && (
                              <p className="mt-1 text-xs text-gray-500">
                                {record.medication}
                                {record.dosage ? ` · ${record.dosage}` : ""}
                              </p>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                            {formatDate(record.next_due_date)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                            {formatMoney(record.cost)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(record.status)}`}
                            >
                              {statusLabel(record.status)}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditForm(record)}
                                title="Edit health record"
                                aria-label={`Edit ${record.title}`}
                                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                <Edit2 size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDelete(record)}
                                title="Delete health record"
                                aria-label={`Delete ${record.title}`}
                                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500">
                    {totalRecords === 0
                      ? "No records"
                      : `Showing ${(page - 1) * 15 + 1}–${Math.min(
                          page * 15,
                          totalRecords,
                        )} of ${totalRecords} records`}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((current) => current - 1)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>

                    <span className="px-2 text-sm text-gray-600">
                      {page} / {lastPage}
                    </span>

                    <button
                      type="button"
                      disabled={page >= lastPage || loading}
                      onClick={() => setPage((current) => current + 1)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      {/* Create / edit modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="health-modal-title"
            className="my-3 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl sm:my-6"
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="health-modal-title"
                  className="text-lg font-bold text-gray-900"
                >
                  {editingRecord ? "Edit health record" : "Add health record"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Record health information for a registered rabbit.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[calc(100vh-190px)] space-y-6 overflow-y-auto p-5 sm:p-6">
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    <AlertCircle className="mt-0.5 shrink-0" size={18} />
                    <p>{error}</p>
                  </div>
                )}

                {rabbits.length === 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    No rabbits could be loaded. Register a rabbit first, and
                    ensure the backend is running before creating a health
                    record.
                  </div>
                )}

                {/* Basic information */}
                <div>
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Basic information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="health-rabbit"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Rabbit <span className="text-red-500">*</span>
                      </label>

                      <select
                        id="health-rabbit"
                        required
                        value={form.rabbit_id}
                        onChange={(event) =>
                          updateForm("rabbit_id", event.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="">Select a rabbit</option>
                        {rabbits.map((rabbit) => (
                          <option key={rabbit.id} value={rabbit.id}>
                            {rabbitLabel(rabbit)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="health-record-date"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Record date <span className="text-red-500">*</span>
                      </label>

                      <input
                        id="health-record-date"
                        type="date"
                        required
                        value={form.record_date}
                        onChange={(event) =>
                          updateForm("record_date", event.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="health-category"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Category <span className="text-red-500">*</span>
                      </label>

                      <select
                        id="health-category"
                        required
                        value={form.category}
                        onChange={(event) =>
                          updateForm(
                            "category",
                            event.target.value as HealthCategory,
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        {CATEGORIES.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="health-title"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Title <span className="text-red-500">*</span>
                      </label>

                      <input
                        id="health-title"
                        type="text"
                        required
                        maxLength={150}
                        value={form.title}
                        onChange={(event) =>
                          updateForm("title", event.target.value)
                        }
                        placeholder="e.g. Routine vaccination"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Health details */}
                <div className="border-t border-gray-100 pt-5">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Health details
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="health-diagnosis"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Diagnosis
                      </label>

                      <textarea
                        id="health-diagnosis"
                        rows={3}
                        maxLength={5000}
                        value={form.diagnosis}
                        onChange={(event) =>
                          updateForm("diagnosis", event.target.value)
                        }
                        placeholder="Diagnosis or suspected condition"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="health-symptoms"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Symptoms
                      </label>

                      <textarea
                        id="health-symptoms"
                        rows={3}
                        maxLength={5000}
                        value={form.symptoms}
                        onChange={(event) =>
                          updateForm("symptoms", event.target.value)
                        }
                        placeholder="Observed symptoms"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="health-treatment"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Treatment or procedure
                      </label>

                      <textarea
                        id="health-treatment"
                        rows={3}
                        maxLength={5000}
                        value={form.treatment}
                        onChange={(event) =>
                          updateForm("treatment", event.target.value)
                        }
                        placeholder="Describe the treatment or procedure"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Medication */}
                <div className="border-t border-gray-100 pt-5">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Medication and provider
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="health-medication"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Medication
                      </label>

                      <input
                        id="health-medication"
                        type="text"
                        maxLength={150}
                        value={form.medication}
                        onChange={(event) =>
                          updateForm("medication", event.target.value)
                        }
                        placeholder="Medication name, if applicable"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="health-dosage"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Dosage
                      </label>

                      <input
                        id="health-dosage"
                        type="text"
                        maxLength={100}
                        value={form.dosage}
                        onChange={(event) =>
                          updateForm("dosage", event.target.value)
                        }
                        placeholder="As directed by a veterinarian"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="health-administered-by"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Administered by
                      </label>

                      <input
                        id="health-administered-by"
                        type="text"
                        maxLength={150}
                        value={form.administered_by}
                        onChange={(event) =>
                          updateForm("administered_by", event.target.value)
                        }
                        placeholder="Veterinarian or staff member"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="health-cost"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Cost (KSh)
                      </label>

                      <input
                        id="health-cost"
                        type="number"
                        min="0"
                        max="99999999.99"
                        step="0.01"
                        value={form.cost}
                        onChange={(event) =>
                          updateForm("cost", event.target.value)
                        }
                        placeholder="0.00"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Follow-up */}
                <div className="border-t border-gray-100 pt-5">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Follow-up and notes
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="health-next-due"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Next due date
                      </label>

                      <input
                        id="health-next-due"
                        type="date"
                        min={form.record_date || undefined}
                        value={form.next_due_date}
                        onChange={(event) =>
                          updateForm("next_due_date", event.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />

                      <p className="mt-1 text-xs text-gray-500">
                        Optional vaccination, checkup, or follow-up reminder.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="health-status"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Status
                      </label>

                      <select
                        id="health-status"
                        value={form.status}
                        onChange={(event) =>
                          updateForm(
                            "status",
                            event.target.value as HealthRecordStatus,
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        {STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="health-notes"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Additional notes
                      </label>

                      <textarea
                        id="health-notes"
                        rows={3}
                        maxLength={5000}
                        value={form.notes}
                        onChange={(event) =>
                          updateForm("notes", event.target.value)
                        }
                        placeholder="Additional observations or instructions"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || rabbits.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle className="animate-spin" size={17} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {editingRecord ? "Save changes" : "Create record"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}