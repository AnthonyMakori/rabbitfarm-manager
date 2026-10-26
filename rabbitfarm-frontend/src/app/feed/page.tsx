
"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardList,
  Edit3,
  History,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Wheat,
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

const inputClass =
  "mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-stone-700";

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

function numberValue(value: number | string | null | undefined): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function formatNumber(value: number | string): string {
  return numberValue(value).toLocaleString("en-KE", {
    maximumFractionDigits: 3,
  });
}

function formatMoney(value: number | string): string {
  return `KES ${numberValue(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function stockStatus(item: InventoryItem): "Low stock" | "In stock" {
  return numberValue(item.quantity_on_hand) <= numberValue(item.reorder_level)
    ? "Low stock"
    : "In stock";
}

const movementLabels: Record<MovementType, string> = {
  received: "Stock received",
  consumed: "Feed consumed",
  damaged: "Damaged feed",
  adjustment_in: "Stock adjustment (+)",
  adjustment_out: "Stock adjustment (-)",
};

export default function FeedPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] =
    useState<InventoryItemInput>(emptyItemForm);

  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementForm, setMovementForm] = useState(emptyMovementForm);

  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [historyMovements, setHistoryMovements] = useState<
    InventoryMovement[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [itemsResponse, lowResponse, movementsResponse] =
        await Promise.all([
          getInventoryItems({
            category: "feed",
            per_page: 100,
          }),
          getInventoryItems({
            category: "feed",
            low_stock: true,
            per_page: 1,
          }),
          getInventoryMovements({
            per_page: 8,
          }),
        ]);

      setItems(itemsResponse.data);
      setTotalItems(itemsResponse.total);
      setLowStockCount(lowResponse.total);

      // Show recent movements belonging only to feed items.
      const feedIds = new Set(itemsResponse.data.map((item) => item.id));
      setMovements(
        movementsResponse.data.filter((movement) =>
          feedIds.has(movement.inventory_item_id)
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load feed information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.item_code.toLowerCase().includes(term) ||
        (item.supplier ?? "").toLowerCase().includes(term);

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && stockStatus(item) === "Low stock") ||
        (stockFilter === "available" &&
          stockStatus(item) === "In stock") ||
        (stockFilter === "inactive" && !item.is_active);

      return matchesSearch && matchesStock;
    });
  }, [items, search, stockFilter]);

  const activeItems = items.filter((item) => item.is_active).length;

  const totalStockValue = items.reduce(
    (sum, item) =>
      sum +
      numberValue(item.quantity_on_hand) * numberValue(item.unit_cost),
    0
  );

  function openCreateModal() {
    setEditingItem(null);
    setItemForm({ ...emptyItemForm });
    setError("");
    setSuccess("");
    setItemModalOpen(true);
  }

  function openEditModal(item: InventoryItem) {
    setEditingItem(item);
    setItemForm({
      item_code: item.item_code,
      name: item.name,
      category: "feed",
      unit: item.unit,
      reorder_level: numberValue(item.reorder_level),
      unit_cost: numberValue(item.unit_cost),
      supplier: item.supplier ?? "",
      storage_location: item.storage_location ?? "",
      is_active: item.is_active,
      notes: item.notes ?? "",
    });
    setError("");
    setSuccess("");
    setItemModalOpen(true);
  }

  async function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload: InventoryItemInput = {
        ...itemForm,
        category: "feed",
        item_code: itemForm.item_code.trim(),
        name: itemForm.name.trim(),
        unit: itemForm.unit.trim(),
        supplier: itemForm.supplier?.trim() || null,
        storage_location: itemForm.storage_location?.trim() || null,
        notes: itemForm.notes?.trim() || null,
        reorder_level: Number(itemForm.reorder_level),
        unit_cost: Number(itemForm.unit_cost),
      };

      if (editingItem) {
        await updateInventoryItem(editingItem.id, payload);
        setSuccess("Feed item updated successfully.");
      } else {
        await createInventoryItem(payload);
        setSuccess(
          "Feed item created. Record a stock receipt to add its opening quantity."
        );
      }

      setItemModalOpen(false);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save feed item."
      );
    } finally {
      setSaving(false);
    }
  }

  function openMovementModal(
    item?: InventoryItem,
    movementType: MovementType = "received"
  ) {
    setMovementForm({
      ...emptyMovementForm,
      inventory_item_id: item ? String(item.id) : "",
      movement_type: movementType,
      unit_cost: item ? String(numberValue(item.unit_cost)) : "",
      moved_at: new Date().toISOString().slice(0, 16),
    });
    setError("");
    setSuccess("");
    setMovementModalOpen(true);
  }

  async function handleMovementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const quantity = Number(movementForm.quantity);
    const itemId = Number(movementForm.inventory_item_id);

    if (!itemId || !Number.isFinite(quantity) || quantity <= 0) {
      setError("Select a feed item and enter a quantity greater than zero.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await createInventoryMovement({
        inventory_item_id: itemId,
        movement_type: movementForm.movement_type,
        quantity,
        unit_cost:
          movementForm.unit_cost.trim() === ""
            ? null
            : Number(movementForm.unit_cost),
        moved_at: new Date(movementForm.moved_at).toISOString(),
        reference: movementForm.reference.trim() || null,
        notes: movementForm.notes.trim() || null,
      });

      setMovementModalOpen(false);
      setSuccess("Feed stock movement recorded successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to record the stock movement."
      );
    } finally {
      setSaving(false);
    }
  }

  async function openHistory(item: InventoryItem) {
    setHistoryItem(item);
    setHistoryMovements([]);
    setHistoryLoading(true);
    setError("");

    try {
      const response = await getInventoryMovements({
        inventory_item_id: item.id,
        per_page: 100,
      });

      setHistoryMovements(response.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load feed movement history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AppSidebar />

      <div className="min-w-0 flex-1 lg:ml-64">
        <AppHeader />

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-stone-500">
                <Wheat size={17} />
                Farm operations / Feed
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                Feed Management
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Manage feed supplies, receipts, consumption, and stock levels.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void loadData()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                onClick={() => openMovementModal()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
              >
                <ArrowDownCircle size={17} />
                Record movement
              </button>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                <Plus size={17} />
                Add feed
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <p className="flex-1">{error}</p>
              <button
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <Package size={19} className="shrink-0" />
              <p className="flex-1">{success}</p>
              <button
                onClick={() => setSuccess("")}
                aria-label="Dismiss message"
              >
                <X size={17} />
              </button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Feed items"
              value={String(totalItems)}
              detail="Items in the feed category"
              icon={<Wheat size={21} />}
            />
            <SummaryCard
              title="Active feed items"
              value={String(activeItems)}
              detail="Currently active catalogue items"
              icon={<Package size={21} />}
            />
            <SummaryCard
              title="Low-stock items"
              value={String(lowStockCount)}
              detail="At or below their reorder level"
              icon={<AlertCircle size={21} />}
              warning={lowStockCount > 0}
            />
            <SummaryCard
              title="Stock value"
              value={formatMoney(totalStockValue)}
              detail="Calculated from the loaded feed items"
              icon={<ArrowUpCircle size={21} />}
            />
          </div>

          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="font-semibold text-stone-900">
                    Feed stock catalogue
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Search feed types and manage their stock records.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search feed..."
                      className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 sm:w-64"
                    />
                  </div>

                  <select
                    value={stockFilter}
                    onChange={(event) => setStockFilter(event.target.value)}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 outline-none focus:border-emerald-600"
                    aria-label="Filter feed stock"
                  >
                    <option value="all">All feed items</option>
                    <option value="low">Low stock</option>
                    <option value="available">Above reorder level</option>
                    <option value="inactive">Inactive items</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 p-12 text-sm text-stone-500">
                <Loader2 size={20} className="animate-spin" />
                Loading feed inventory...
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <Wheat size={24} />
                </div>
                <h3 className="font-semibold text-stone-900">
                  No feed items found
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
                  Add a feed item or change your search and filters.
                </p>
                <button
                  onClick={openCreateModal}
                  className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Add your first feed item
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                      <tr>
                        <th className="px-5 py-3.5">Feed item</th>
                        <th className="px-5 py-3.5">Supplier</th>
                        <th className="px-5 py-3.5">Quantity</th>
                        <th className="px-5 py-3.5">Reorder level</th>
                        <th className="px-5 py-3.5">Unit cost</th>
                        <th className="px-5 py-3.5">Stock status</th>
                        <th className="px-5 py-3.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {visibleItems.map((item) => {
                        const status = stockStatus(item);
                        return (
                          <tr key={item.id} className="hover:bg-stone-50/70">
                            <td className="px-5 py-4">
                              <div className="font-semibold text-stone-900">
                                {item.name}
                              </div>
                              <div className="mt-1 text-xs text-stone-500">
                                {item.item_code} · {item.unit}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-stone-600">
                              {item.supplier || "—"}
                            </td>
                            <td className="px-5 py-4 font-semibold text-stone-900">
                              {formatNumber(item.quantity_on_hand)}{" "}
                              <span className="font-normal text-stone-500">
                                {item.unit}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-stone-600">
                              {formatNumber(item.reorder_level)} {item.unit}
                            </td>
                            <td className="px-5 py-4 text-stone-600">
                              {formatMoney(item.unit_cost)}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  !item.is_active
                                    ? "bg-stone-100 text-stone-600"
                                    : status === "Low stock"
                                      ? "bg-amber-50 text-amber-800"
                                      : "bg-emerald-50 text-emerald-800"
                                }`}
                              >
                                {!item.is_active ? "Inactive" : status}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openMovementModal(item, "received")}
                                  title="Receive feed"
                                  aria-label={`Receive ${item.name}`}
                                  className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"
                                >
                                  <ArrowDownCircle size={17} />
                                </button>
                                <button
                                  onClick={() => openMovementModal(item, "consumed")}
                                  title="Record consumption"
                                  aria-label={`Record consumption for ${item.name}`}
                                  className="rounded-lg p-2 text-amber-700 hover:bg-amber-50"
                                >
                                  <ArrowUpCircle size={17} />
                                </button>
                                <button
                                  onClick={() => openEditModal(item)}
                                  title="Edit feed item"
                                  aria-label={`Edit ${item.name}`}
                                  className="rounded-lg p-2 text-stone-600 hover:bg-stone-100"
                                >
                                  <Edit3 size={17} />
                                </button>
                                <button
                                  onClick={() => void openHistory(item)}
                                  title="Movement history"
                                  aria-label={`View history for ${item.name}`}
                                  className="rounded-lg p-2 text-stone-600 hover:bg-stone-100"
                                >
                                  <History size={17} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-stone-100 px-5 py-3 text-xs text-stone-500">
                  Showing {visibleItems.length} of {items.length} loaded feed
                  items. The catalogue request loads up to 100 items.
                </div>
              </>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-stone-100 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <ClipboardList size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-stone-900">
                  Recent feed movements
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Recent transactions for the feed items currently loaded.
                </p>
              </div>
            </div>

            {movements.length === 0 ? (
              <p className="p-6 text-sm text-stone-500">
                No recent feed movements found.
              </p>
            ) : (
              <div className="divide-y divide-stone-100">
                {movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex flex-col justify-between gap-2 px-5 py-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-medium text-stone-900">
                        {movement.inventory_item?.name ??
                          items.find(
                            (item) => item.id === movement.inventory_item_id
                          )?.name ??
                          "Feed item"}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {movementLabels[movement.movement_type]} ·{" "}
                        {formatDate(movement.moved_at)}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-stone-800">
                      {formatNumber(movement.quantity)}{" "}
                      {movement.inventory_item?.unit ??
                        items.find(
                          (item) => item.id === movement.inventory_item_id
                        )?.unit ??
                        ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {itemModalOpen && (
        <Modal
          title={editingItem ? "Edit feed item" : "Add feed item"}
          onClose={() => setItemModalOpen(false)}
        >
          <form onSubmit={handleItemSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Item code">
                <input
                  required
                  value={itemForm.item_code}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, item_code: e.target.value })
                  }
                  className={inputClass}
                  placeholder="FEED-001"
                />
              </Field>
              <Field label="Feed name">
                <input
                  required
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Rabbit pellets"
                />
              </Field>
              <Field label="Unit">
                <select
                  required
                  value={itemForm.unit}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, unit: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="bag">Bag</option>
                  <option value="litre">Litre</option>
                  <option value="piece">Piece</option>
                </select>
              </Field>
              <Field label="Reorder level">
                <input
                  required
                  min="0"
                  step="0.001"
                  type="number"
                  value={itemForm.reorder_level}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      reorder_level: Number(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Unit cost (KES)">
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={itemForm.unit_cost}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      unit_cost: Number(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Supplier">
                <input
                  value={itemForm.supplier ?? ""}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, supplier: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Supplier name"
                />
              </Field>
              <Field label="Storage location">
                <input
                  value={itemForm.storage_location ?? ""}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      storage_location: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="Feed store"
                />
              </Field>
              <Field label="Status">
                <select
                  value={itemForm.is_active ? "active" : "inactive"}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      is_active: e.target.value === "active",
                    })
                  }
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                rows={3}
                value={itemForm.notes ?? ""}
                onChange={(e) =>
                  setItemForm({ ...itemForm, notes: e.target.value })
                }
                className={inputClass}
                placeholder="Additional details..."
              />
            </Field>

            <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              Opening stock is recorded separately using a stock receipt. This
              keeps the stock ledger accurate.
            </p>

            <div className="flex justify-end gap-3 border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={() => setItemModalOpen(false)}
                className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingItem ? "Save changes" : "Create feed item"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {movementModalOpen && (
        <Modal
          title="Record feed movement"
          onClose={() => setMovementModalOpen(false)}
        >
          <form onSubmit={handleMovementSubmit} className="space-y-4">
            <Field label="Feed item">
              <select
                required
                value={movementForm.inventory_item_id}
                onChange={(e) =>
                  setMovementForm({
                    ...movementForm,
                    inventory_item_id: e.target.value,
                  })
                }
                className={inputClass}
              >
                <option value="">Select feed item</option>
                {items
                  .filter((item) => item.is_active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_code} — {item.name} (
                      {formatNumber(item.quantity_on_hand)} {item.unit})
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Movement type">
              <select
                value={movementForm.movement_type}
                onChange={(e) =>
                  setMovementForm({
                    ...movementForm,
                    movement_type: e.target.value as MovementType,
                  })
                }
                className={inputClass}
              >
                <option value="received">Stock received</option>
                <option value="consumed">Feed consumed</option>
                <option value="damaged">Damaged feed</option>
                <option value="adjustment_in">Adjustment increase</option>
                <option value="adjustment_out">Adjustment decrease</option>
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quantity">
                <input
                  required
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={movementForm.quantity}
                  onChange={(e) =>
                    setMovementForm({
                      ...movementForm,
                      quantity: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="0.000"
                />
              </Field>
              <Field label="Unit cost (KES, optional)">
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
                />
              </Field>
            </div>

            <Field label="Date and time">
              <input
                required
                type="datetime-local"
                value={movementForm.moved_at}
                onChange={(e) =>
                  setMovementForm({
                    ...movementForm,
                    moved_at: e.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>

            <Field label="Reference (optional)">
              <input
                value={movementForm.reference}
                onChange={(e) =>
                  setMovementForm({
                    ...movementForm,
                    reference: e.target.value,
                  })
                }
                className={inputClass}
                placeholder="Invoice or transaction reference"
              />
            </Field>

            <Field label="Notes (optional)">
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
                placeholder="Reason or additional details..."
              />
            </Field>

            <div className="flex justify-end gap-3 border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={() => setMovementModalOpen(false)}
                className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Save movement
              </button>
            </div>
          </form>
        </Modal>
      )}

      {historyItem && (
        <Modal
          title={`Movement history — ${historyItem.name}`}
          onClose={() => setHistoryItem(null)}
          wide
        >
          {historyLoading ? (
            <div className="flex items-center justify-center gap-3 p-8 text-sm text-stone-500">
              <Loader2 size={20} className="animate-spin" />
              Loading movement history...
            </div>
          ) : historyMovements.length === 0 ? (
            <p className="p-6 text-sm text-stone-500">
              No movements have been recorded for this feed item.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="sticky top-0 bg-stone-50 text-xs uppercase text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Movement</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Reference / notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {historyMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td className="px-4 py-3 text-stone-600">
                        {formatDate(movement.moved_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-stone-800">
                        {movementLabels[movement.movement_type]}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(movement.quantity)} {historyItem.unit}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {movement.reference || movement.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {historyMovements.length === 100 && (
                <p className="p-3 text-xs text-stone-500">
                  Showing up to 100 movements for this item.
                </p>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  icon,
  warning = false,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            warning
              ? "bg-amber-50 text-amber-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-stone-500">{detail}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6 ${
          wide ? "max-w-4xl" : "max-w-2xl"
        }`}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-stone-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
