
"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Archive,
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit3,
  History,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  TrendingDown,
  X,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";

import {
  createInventoryItem,
  createInventoryMovement,
  getInventoryItems,
  getInventoryMovements,
  updateInventoryItem,
  type InventoryItem,
  type InventoryItemInput,
  type InventoryMovement,
  type MovementType,
} from "@/lib/inventory-api";

const categories = [
  { value: "feed", label: "Feed" },
  { value: "medicine", label: "Medicine" },
  { value: "cleaning", label: "Cleaning" },
  { value: "equipment", label: "Equipment" },
  { value: "supplies", label: "Supplies" },
];

const movementOptions: { value: MovementType; label: string }[] = [
  { value: "received", label: "Stock received" },
  { value: "consumed", label: "Stock consumed" },
  { value: "damaged", label: "Damaged stock" },
  { value: "adjustment_in", label: "Stock adjustment (increase)" },
  { value: "adjustment_out", label: "Stock adjustment (decrease)" },
];

const emptyItemForm: InventoryItemInput = {
  item_code: "",
  name: "",
  category: "feed",
  unit: "kg",
  reorder_level: 0,
  unit_cost: 0,
  supplier: "",
  storage_location: "",
  is_active: true,
  notes: "",
};

const emptyMovementForm = {
  inventory_item_id: "",
  movement_type: "received" as MovementType,
  quantity: "",
  unit_cost: "",
  moved_at: new Date().toISOString().slice(0, 16),
  reference: "",
  notes: "",
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-stone-700";

function amount(value: number | string | null | undefined): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function formatNumber(value: number | string): string {
  return amount(value).toLocaleString("en-KE", {
    maximumFractionDigits: 3,
  });
}

function formatMoney(value: number | string): string {
  return `KES ${amount(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function categoryLabel(category: string): string {
  return categories.find((item) => item.value === category)?.label ?? category;
}

function movementLabel(type: MovementType): string {
  return movementOptions.find((item) => item.value === type)?.label ?? type;
}

function isStockIncrease(type: MovementType): boolean {
  return type === "received" || type === "adjustment_in";
}

function stockIsLow(item: InventoryItem): boolean {
  return amount(item.quantity_on_hand) <= amount(item.reorder_level);
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Package;
  tone: "green" | "amber" | "blue" | "red";
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-sky-50 text-sky-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-stone-500">{label}</p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-stone-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-stone-500">{detail}</p>
        </div>
        <div className={`rounded-xl p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lowStockTotal, setLowStockTotal] = useState(0);

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState<InventoryItemInput>(emptyItemForm);
  const [savingItem, setSavingItem] = useState(false);
  const [formError, setFormError] = useState("");

  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [savingMovement, setSavingMovement] = useState(false);
  const [movementError, setMovementError] = useState("");

  const [showHistory, setShowHistory] = useState(false);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyItemId, setHistoryItemId] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getInventoryItems({
        search: search.trim() || undefined,
        category: category || undefined,
        low_stock: stockFilter === "low" ? true : undefined,
        page,
        per_page: 10,
      });

      setItems(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);

      // Fetch the total number of low-stock items independently of
      // the current search, category, and pagination filters.
      const lowResult = await getInventoryItems({
        low_stock: true,
        per_page: 1,
      });

      setLowStockTotal(lowResult.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load inventory. Check the API connection.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, category, stockFilter, page]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const loadedStockValue = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + amount(item.quantity_on_hand) * amount(item.unit_cost),
        0,
      ),
    [items],
  );

  const activeItemsOnPage = useMemo(
    () => items.filter((item) => item.is_active).length,
    [items],
  );

  async function loadHistory(itemId = historyItemId) {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const result = await getInventoryMovements({
        inventory_item_id: itemId ? Number(itemId) : undefined,
        per_page: 50,
      });

      setMovements(result.data);
    } catch (err) {
      setHistoryError(
        err instanceof Error
          ? err.message
          : "Unable to load stock movement history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  function openCreateForm() {
    setEditingItem(null);
    setItemForm({ ...emptyItemForm });
    setFormError("");
    setShowItemForm(true);
  }

  function openEditForm(item: InventoryItem) {
    setEditingItem(item);
    setItemForm({
      item_code: item.item_code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      reorder_level: amount(item.reorder_level),
      unit_cost: amount(item.unit_cost),
      supplier: item.supplier ?? "",
      storage_location: item.storage_location ?? "",
      is_active: item.is_active,
      notes: item.notes ?? "",
    });
    setFormError("");
    setShowItemForm(true);
  }

  function openMovementForm(item?: InventoryItem) {
    setMovementError("");
    setMovementForm({
      ...emptyMovementForm,
      inventory_item_id: item ? String(item.id) : "",
      unit_cost: item ? String(amount(item.unit_cost)) : "",
    });
    setShowMovementForm(true);
  }

  async function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingItem(true);
    setFormError("");
    setNotice("");

    try {
      const payload: InventoryItemInput = {
        item_code: itemForm.item_code.trim(),
        name: itemForm.name.trim(),
        category: itemForm.category,
        unit: itemForm.unit.trim(),
        reorder_level: Number(itemForm.reorder_level),
        unit_cost: Number(itemForm.unit_cost),
        supplier: itemForm.supplier?.trim() || null,
        storage_location: itemForm.storage_location?.trim() || null,
        is_active: itemForm.is_active ?? true,
        notes: itemForm.notes?.trim() || null,
      };

      if (
        !payload.item_code ||
        !payload.name ||
        !payload.category ||
        !payload.unit
      ) {
        setFormError("Please complete all required fields.");
        return;
      }

      if (
        !Number.isFinite(payload.reorder_level) ||
        payload.reorder_level < 0 ||
        !Number.isFinite(payload.unit_cost) ||
        payload.unit_cost < 0
      ) {
        setFormError("Reorder level and unit cost must be zero or greater.");
        return;
      }

      if (editingItem) {
        await updateInventoryItem(editingItem.id, payload);
        setNotice("Inventory item updated successfully.");
      } else {
        await createInventoryItem(payload);
        setNotice("Inventory item created successfully. Record its opening stock using a stock movement.");
      }

      setShowItemForm(false);
      setEditingItem(null);
      setItemForm({ ...emptyItemForm });
      await loadItems();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to save the inventory item.",
      );
    } finally {
      setSavingItem(false);
    }
  }

  async function handleMovementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingMovement(true);
    setMovementError("");
    setNotice("");

    try {
      const itemId = Number(movementForm.inventory_item_id);
      const quantity = Number(movementForm.quantity);
      const unitCost =
        movementForm.unit_cost.trim() === ""
          ? undefined
          : Number(movementForm.unit_cost);

      if (!Number.isInteger(itemId) || itemId < 1) {
        setMovementError("Please select an inventory item.");
        return;
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        setMovementError("Quantity must be greater than zero.");
        return;
      }

      if (
        unitCost !== undefined &&
        (!Number.isFinite(unitCost) || unitCost < 0)
      ) {
        setMovementError("Unit cost must be zero or greater.");
        return;
      }

      await createInventoryMovement({
        inventory_item_id: itemId,
        movement_type: movementForm.movement_type,
        quantity,
        unit_cost: unitCost,
        moved_at: movementForm.moved_at
          ? new Date(movementForm.moved_at).toISOString()
          : undefined,
        reference: movementForm.reference.trim() || null,
        notes: movementForm.notes.trim() || null,
      });

      setShowMovementForm(false);
      setMovementForm({ ...emptyMovementForm });
      setNotice("Stock movement recorded successfully.");
      await loadItems();

      if (showHistory) {
        await loadHistory();
      }
    } catch (err) {
      setMovementError(
        err instanceof Error
          ? err.message
          : "Unable to record this stock movement.",
      );
    } finally {
      setSavingMovement(false);
    }
  }

  async function handleDeactivate(item: InventoryItem) {
    const confirmed = window.confirm(
      `Deactivate "${item.name}"? It will no longer accept stock movements.`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await updateInventoryItem(item.id, { is_active: false });
      setNotice(`${item.name} has been deactivated.`);
      await loadItems();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to deactivate this item.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9f6] text-stone-900">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        <div className="min-w-0 flex-1 lg:ml-64">
          <AppHeader />

          <main className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <p className="mb-2 text-sm font-medium text-emerald-700">
                  Farm operations / Inventory
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                  Feed & Inventory
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-stone-500">
                  Manage feed, medicines, equipment and supplies. Track every
                  delivery, issue and stock adjustment.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowHistory(true);
                    void loadHistory("");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                >
                  <History className="h-4 w-4" />
                  Movement history
                </button>

                <button
                  type="button"
                  onClick={() => openMovementForm()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Record movement
                </button>

                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  <Plus className="h-4 w-4" />
                  Add item
                </button>
              </div>
            </div>

            {notice && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="flex-1">{notice}</p>
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Unable to load inventory</p>
                  <p className="mt-1 break-words">{error}</p>
                  <p className="mt-2 text-red-700">
                    Check that Laravel is running and the API URL is correct.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadItems()}
                  className="shrink-0 font-semibold underline"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Inventory items"
                value={total.toLocaleString("en-KE")}
                detail="Items matching the current filters"
                icon={Package}
                tone="green"
              />
              <StatCard
                label="Low-stock items"
                value={lowStockTotal.toLocaleString("en-KE")}
                detail="At or below their reorder level"
                icon={TrendingDown}
                tone="amber"
              />
              <StatCard
                label="Active items on page"
                value={activeItemsOnPage.toLocaleString("en-KE")}
                detail="Shown on this page"
                icon={Archive}
                tone="blue"
              />
              <StatCard
                label="Value of items on page"
                value={formatMoney(loadedStockValue)}
                detail="Quantity × unit cost for shown items"
                icon={ClipboardList}
                tone="red"
              />
            </div>

            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <div className="border-b border-stone-100 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-stone-900">
                      Inventory catalogue
                    </h2>
                    <p className="mt-1 text-sm text-stone-500">
                      Search your stock records and manage item details.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void loadItems()}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50 xl:self-auto"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="relative md:col-span-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Search name, code or supplier..."
                      className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <select
                    value={category}
                    onChange={(event) => {
                      setCategory(event.target.value);
                      setPage(1);
                    }}
                    className={inputClass.replace("mt-1.5 ", "")}
                    aria-label="Filter by category"
                  >
                    <option value="">All categories</option>
                    {categories.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={stockFilter}
                    onChange={(event) => {
                      setStockFilter(event.target.value as "all" | "low");
                      setPage(1);
                    }}
                    className={inputClass.replace("mt-1.5 ", "")}
                    aria-label="Filter by stock level"
                  >
                    <option value="all">All stock levels</option>
                    <option value="low">Low stock only</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-stone-500">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                  Loading inventory from Laravel...
                </div>
              ) : items.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-500">
                    <Package className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 font-semibold text-stone-900">
                    No inventory items found
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
                    Add your first feed or supply item, or change the search
                    and filters.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    <Plus className="h-4 w-4" />
                    Add first item
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-left text-sm">
                      <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                        <tr>
                          <th className="px-5 py-3.5 font-semibold">Item</th>
                          <th className="px-5 py-3.5 font-semibold">Category</th>
                          <th className="px-5 py-3.5 font-semibold">In stock</th>
                          <th className="px-5 py-3.5 font-semibold">Reorder at</th>
                          <th className="px-5 py-3.5 font-semibold">Unit cost</th>
                          <th className="px-5 py-3.5 font-semibold">Status</th>
                          <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-stone-50/70">
                            <td className="px-5 py-4">
                              <div className="font-semibold text-stone-900">
                                {item.name}
                              </div>
                              <div className="mt-1 text-xs text-stone-500">
                                {item.item_code}
                                {item.storage_location
                                  ? ` · ${item.storage_location}`
                                  : ""}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                                {categoryLabel(item.category)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div
                                className={`font-semibold ${
                                  stockIsLow(item)
                                    ? "text-amber-700"
                                    : "text-stone-900"
                                }`}
                              >
                                {formatNumber(item.quantity_on_hand)}{" "}
                                <span className="font-normal text-stone-500">
                                  {item.unit}
                                </span>
                              </div>
                              {stockIsLow(item) && (
                                <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  Low stock
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-stone-600">
                              {formatNumber(item.reorder_level)} {item.unit}
                            </td>
                            <td className="px-5 py-4 text-stone-700">
                              {formatMoney(item.unit_cost)}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                  item.is_active
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-stone-100 text-stone-500"
                                }`}
                              >
                                {item.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openMovementForm(item)}
                                  disabled={!item.is_active}
                                  title="Record stock movement"
                                  className="rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <ArrowLeftRight className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHistoryItemId(String(item.id));
                                    setShowHistory(true);
                                    void loadHistory(String(item.id));
                                  }}
                                  title="View movement history"
                                  className="rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-100"
                                >
                                  <History className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditForm(item)}
                                  title="Edit item"
                                  className="rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-100"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                {item.is_active && (
                                  <button
                                    type="button"
                                    onClick={() => void handleDeactivate(item)}
                                    title="Deactivate item"
                                    className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Archive className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-stone-500">
                      {total} item{total === 1 ? "" : "s"} · Page {page} of{" "}
                      {lastPage}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={page <= 1}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPage((current) => Math.min(lastPage, current + 1))
                        }
                        disabled={page >= lastPage}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                    <ArrowDownCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-stone-900">
                      Receive or issue stock
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-stone-500">
                      Record deliveries and stock usage. Balances are updated by
                      the backend and insufficient stock is rejected.
                    </p>
                    <button
                      type="button"
                      onClick={() => openMovementForm()}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-900"
                    >
                      Record a movement <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-stone-900">
                      Reorder attention
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-stone-500">
                      {lowStockTotal > 0
                        ? `${lowStockTotal} item(s) are at or below their reorder level. Review the low-stock list before ordering more supplies.`
                        : "No inventory items are currently at or below their reorder level."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStockFilter("low");
                        setPage(1);
                      }}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-800 hover:text-amber-900"
                    >
                      View low-stock items <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-950/40 p-4 sm:items-center">
          <div className="my-4 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-100 p-5 sm:p-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  {editingItem ? "Edit inventory item" : "Add inventory item"}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Stock quantity is managed through stock movements.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowItemForm(false)}
                aria-label="Close form"
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="space-y-5 p-5 sm:p-6">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {formError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Item code *
                  <input
                    required
                    maxLength={50}
                    value={itemForm.item_code}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, item_code: e.target.value })
                    }
                    className={inputClass}
                    placeholder="FEED-001"
                  />
                </label>
                <label className={labelClass}>
                  Item name *
                  <input
                    required
                    value={itemForm.name}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, name: e.target.value })
                    }
                    className={inputClass}
                    placeholder="Rabbit pellets"
                  />
                </label>
                <label className={labelClass}>
                  Category *
                  <select
                    required
                    value={itemForm.category}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, category: e.target.value })
                    }
                    className={inputClass}
                  >
                    {categories.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  Unit of measure *
                  <select
                    required
                    value={itemForm.unit}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, unit: e.target.value })
                    }
                    className={inputClass}
                  >
                    {["kg", "g", "bag", "litre", "ml", "piece", "bottle", "pack", "unit"].map(
                      (unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className={labelClass}>
                  Reorder level *
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    required
                    value={itemForm.reorder_level}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        reorder_level: Number(e.target.value),
                      })
                    }
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Unit cost (KES) *
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={itemForm.unit_cost}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        unit_cost: Number(e.target.value),
                      })
                    }
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Supplier
                  <input
                    value={itemForm.supplier ?? ""}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, supplier: e.target.value })
                    }
                    className={inputClass}
                    placeholder="Supplier name"
                  />
                </label>
                <label className={labelClass}>
                  Storage location
                  <input
                    value={itemForm.storage_location ?? ""}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        storage_location: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="Main feed store"
                  />
                </label>
                {editingItem && (
                  <label className="flex items-center gap-3 text-sm font-medium text-stone-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={itemForm.is_active ?? true}
                      onChange={(e) =>
                        setItemForm({
                          ...itemForm,
                          is_active: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                    />
                    Item is active and can receive stock movements
                  </label>
                )}
                <label className={`${labelClass} sm:col-span-2`}>
                  Notes
                  <textarea
                    rows={3}
                    value={itemForm.notes ?? ""}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, notes: e.target.value })
                    }
                    className={inputClass}
                    placeholder="Optional item details..."
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowItemForm(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {savingItem && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingItem ? "Save changes" : "Create item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMovementForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-950/40 p-4 sm:items-center">
          <div className="my-4 w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-100 p-5 sm:p-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  Record stock movement
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Record a delivery, usage, damage or stock correction.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMovementForm(false)}
                aria-label="Close form"
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleMovementSubmit}
              className="space-y-5 p-5 sm:p-6"
            >
              {movementError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {movementError}
                </div>
              )}

              <label className={labelClass}>
                Inventory item *
                <select
                  required
                  value={movementForm.inventory_item_id}
                  onChange={(e) => {
                    const selected = items.find(
                      (item) => item.id === Number(e.target.value),
                    );
                    setMovementForm({
                      ...movementForm,
                      inventory_item_id: e.target.value,
                      unit_cost: selected
                        ? String(amount(selected.unit_cost))
                        : "",
                    });
                  }}
                  className={inputClass}
                >
                  <option value="">Select an active item</option>
                  {items
                    .filter((item) => item.is_active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.item_code} — {item.name} (
                        {formatNumber(item.quantity_on_hand)} {item.unit})
                      </option>
                    ))}
                </select>
                <span className="mt-1 block text-xs font-normal text-stone-500">
                  Only active items on the current catalogue page are shown.
                  Clear search and filters if the item is missing.
                </span>
              </label>

              <label className={labelClass}>
                Movement type *
                <select
                  required
                  value={movementForm.movement_type}
                  onChange={(e) =>
                    setMovementForm({
                      ...movementForm,
                      movement_type: e.target.value as MovementType,
                    })
                  }
                  className={inputClass}
                >
                  {movementOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Quantity *
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    value={movementForm.quantity}
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        quantity: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="e.g. 25"
                  />
                </label>

                <label className={labelClass}>
                  Unit cost (KES)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={movementForm.unit_cost}
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        unit_cost: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="Optional"
                  />
                </label>
              </div>

              <label className={labelClass}>
                Date and time *
                <input
                  type="datetime-local"
                  required
                  value={movementForm.moved_at}
                  onChange={(e) =>
                    setMovementForm({
                      ...movementForm,
                      moved_at: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Reference
                <input
                  value={movementForm.reference}
                  onChange={(e) =>
                    setMovementForm({
                      ...movementForm,
                      reference: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="e.g. DELIVERY-001"
                />
              </label>

              <label className={labelClass}>
                Notes
                <textarea
                  rows={3}
                  value={movementForm.notes}
                  onChange={(e) =>
                    setMovementForm({
                      ...movementForm,
                      notes: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="Reason for this movement..."
                />
              </label>

              <div className="rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
                {isStockIncrease(movementForm.movement_type) ? (
                  <span className="inline-flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4 text-emerald-700" />
                    This movement increases the stock balance.
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4 text-amber-700" />
                    This movement decreases stock. The backend rejects
                    quantities greater than available stock.
                  </span>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowMovementForm(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMovement}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {savingMovement && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-950/40 p-3 sm:p-6">
          <div className="my-4 w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  Stock movement history
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Recent stock receipts, usage, damage and adjustments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                aria-label="Close history"
                className="self-end rounded-lg p-2 text-stone-500 hover:bg-stone-100 sm:self-auto"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={historyItemId}
                  onChange={(e) => {
                    setHistoryItemId(e.target.value);
                    void loadHistory(e.target.value);
                  }}
                  className={inputClass.replace("mt-1.5 ", "")}
                  aria-label="Filter movement history by item"
                >
                  <option value="">All inventory items</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_code} — {item.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void loadHistory()}
                  disabled={historyLoading}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${historyLoading ? "animate-spin" : ""}`}
                  />
                  Refresh history
                </button>
              </div>

              {historyError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {historyError}
                </div>
              )}

              {historyLoading ? (
                <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-stone-500">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                  Loading movement history...
                </div>
              ) : movements.length === 0 ? (
                <div className="rounded-xl bg-stone-50 px-5 py-12 text-center text-sm text-stone-500">
                  No stock movements found for this filter.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Item</th>
                        <th className="px-4 py-3 font-semibold">Movement</th>
                        <th className="px-4 py-3 font-semibold">Quantity</th>
                        <th className="px-4 py-3 font-semibold">Reference / notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {movements.map((movement) => (
                        <tr key={movement.id}>
                          <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                            {formatDate(movement.moved_at)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-stone-800">
                              {movement.inventory_item?.name ??
                                `Item #${movement.inventory_item_id}`}
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                              {movement.inventory_item?.item_code ?? ""}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-stone-700">
                            {movementLabel(movement.movement_type)}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 font-semibold ${
                              isStockIncrease(movement.movement_type)
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {isStockIncrease(movement.movement_type) ? "+" : "−"}
                            {formatNumber(movement.quantity)}{" "}
                            {movement.inventory_item?.unit ?? ""}
                          </td>
                          <td className="max-w-xs px-4 py-3">
                            <p className="break-words text-stone-700">
                              {movement.reference || "—"}
                            </p>
                            {movement.notes && (
                              <p className="mt-1 break-words text-xs text-stone-500">
                                {movement.notes}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-stone-500">
                Showing up to 50 recent movements. Use filters to narrow the
                history.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
