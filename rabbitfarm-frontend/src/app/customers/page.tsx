
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  UserRound,
  Users,
  Building2,
  Phone,
  Mail,
  MapPin,
  UserX,
  RefreshCw,
  X,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";

import {
  createCustomer,
  deactivateCustomer,
  getCustomers,
  updateCustomer,
  type Customer,
  type CustomerInput,
  type CustomerType,
} from "@/lib/customers-api";

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  customer_type: CustomerType;
  address: string;
  notes: string;
  is_active: boolean;
};

const emptyForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  customer_type: "individual",
  address: "",
  notes: "",
  is_active: true,
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const filters: {
        search?: string;
        is_active?: boolean;
        per_page: number;
      } = { per_page: 100 };

      if (search) filters.search = search;

      if (statusFilter !== "all") {
        filters.is_active = statusFilter === "active";
      }

      const response = await getCustomers(filters);
      setCustomers(response.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load customers.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  function openCreateModal() {
    setEditingCustomer(null);
    setForm({ ...emptyForm });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(customer: Customer) {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      customer_type: customer.customer_type,
      address: customer.address ?? "",
      notes: customer.notes ?? "",
      is_active: customer.is_active,
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function updateField<K extends keyof CustomerForm>(
    field: K,
    value: CustomerForm[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const input: CustomerInput = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      customer_type: form.customer_type,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    };

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, input);
        setSuccess("Customer updated successfully.");
      } else {
        await createCustomer(input);
        setSuccess("Customer registered successfully.");
      }

      setModalOpen(false);
      await loadCustomers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the customer.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(customer: Customer) {
    const confirmed = window.confirm(
      `Deactivate ${customer.name}? Their customer record will be preserved.`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deactivateCustomer(customer.id);
      setSuccess(`${customer.name} was deactivated.`);
      await loadCustomers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to deactivate customer.",
      );
    }
  }

  const activeCount = customers.filter(
    (customer) => customer.is_active,
  ).length;

  const businessCount = customers.filter(
    (customer) => customer.customer_type === "business",
  ).length;

  const individualCount = customers.filter(
    (customer) => customer.customer_type === "individual",
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar />

      <div className="min-w-0 flex-1 lg:ml-64">
        <AppHeader />

        <main className="mx-auto max-w-9xl space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Customers
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage rabbit buyers and customer contact details.
              </p>
            </div>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Plus size={18} />
              Add customer
            </button>
          </div>

          {error && !modalOpen && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {success}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Customers shown"
              value={customers.length}
              icon={<Users size={20} />}
            />
            <SummaryCard
              label="Active customers"
              value={activeCount}
              icon={<UserRound size={20} />}
            />
            <SummaryCard
              label="Individual buyers"
              value={individualCount}
              icon={<UserRound size={20} />}
            />
            <SummaryCard
              label="Business customers"
              value={businessCount}
              icon={<Building2 size={20} />}
            />
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center">
              <form
                className="flex flex-1 gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearch(searchInput.trim());
                }}
              >
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search name, code, phone, or email..."
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Search
                </button>
              </form>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                aria-label="Filter customers by status"
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>

              <button
                onClick={() => void loadCustomers()}
                disabled={loading}
                aria-label="Refresh customers"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Contact</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        Loading customers...
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-12 text-center"
                      >
                        <Users
                          size={30}
                          className="mx-auto mb-2 text-slate-300"
                        />
                        <p className="font-medium text-slate-700">
                          No customers found
                        </p>
                        <p className="mt-1 text-slate-500">
                          Try another search or register your first customer.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {customer.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {customer.customer_code}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1.5 text-slate-600">
                            {customer.phone && (
                              <p className="flex items-center gap-2">
                                <Phone size={14} />
                                {customer.phone}
                              </p>
                            )}
                            {customer.email && (
                              <p className="flex items-center gap-2">
                                <Mail size={14} />
                                {customer.email}
                              </p>
                            )}
                            {!customer.phone && !customer.email && (
                              <span className="text-slate-400">
                                No contact details
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                            {customer.customer_type === "business" ? (
                              <Building2 size={13} />
                            ) : (
                              <UserRound size={13} />
                            )}
                            {customer.customer_type}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              customer.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {customer.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(customer)}
                              title="Edit customer"
                              aria-label={`Edit ${customer.name}`}
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                            >
                              <Pencil size={16} />
                            </button>

                            {customer.is_active && (
                              <button
                                onClick={() =>
                                  void handleDeactivate(customer)
                                }
                                title="Deactivate customer"
                                aria-label={`Deactivate ${customer.name}`}
                                className="rounded-lg border border-slate-200 p-2 text-red-600 hover:bg-red-50"
                              >
                                <UserX size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
              Showing up to 100 matching customers. Pagination can be added
              when the customer list grows.
            </div>
          </section>
        </main>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-form-title"
            className="my-4 w-full max-w-2xl rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2
                  id="customer-form-title"
                  className="text-lg font-bold text-slate-900"
                >
                  {editingCustomer ? "Edit customer" : "Register customer"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the buyer's information below.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2"
                  >
                    {error}
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label
                    htmlFor="customer-name"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Full name / Business name *
                  </label>
                  <input
                    id="customer-name"
                    required
                    maxLength={255}
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    placeholder="e.g. Jane Wanjiku"
                  />
                </div>

                <div>
                  <label
                    htmlFor="customer-type"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Customer type *
                  </label>
                  <select
                    id="customer-type"
                    value={form.customer_type}
                    onChange={(event) =>
                      updateField(
                        "customer_type",
                        event.target.value as CustomerType,
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="customer-phone"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Phone number
                  </label>
                  <input
                    id="customer-phone"
                    type="tel"
                    maxLength={30}
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    placeholder="e.g. 0712345678"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="customer-email"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Email address
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    maxLength={255}
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    placeholder="customer@example.com"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="customer-address"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Address / Location
                  </label>
                  <textarea
                    id="customer-address"
                    rows={2}
                    value={form.address}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    placeholder="Town, estate, or delivery address"
                  />
                  {form.address && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <MapPin size={12} />
                      Address saved with customer details
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="customer-notes"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Notes
                  </label>
                  <textarea
                    id="customer-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(event) =>
                      updateField("notes", event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    placeholder="Delivery preferences or other relevant notes"
                  />
                </div>

                {editingCustomer && (
                  <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) =>
                        updateField("is_active", event.target.checked)
                      }
                      className="h-4 w-4 accent-emerald-700"
                    />
                    Customer is active
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingCustomer
                      ? "Save changes"
                      : "Register customer"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
