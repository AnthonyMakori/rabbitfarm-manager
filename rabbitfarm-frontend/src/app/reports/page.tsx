
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Baby,
  CalendarDays,
  CheckCircle2,
  Download,
  DollarSign,
  Egg,
  Layers3,
  PawPrint,
  RefreshCw,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import {
  getReportsOverview,
  type ReportsOverview,
  type ReportBreakdown,
} from "@/lib/reports-api";
import { FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

const number = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 3,
  }).format(Number(value ?? 0));

const labelize = (value?: string) =>
  (value ?? "Unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function MetricCard({
  title,
  value,
  detail,
  icon,
  tone = "green",
}: {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone?: "green" | "blue" | "amber" | "purple" | "red";
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-gray-900">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${tones[tone]}`}>{icon}</div>
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-500">{detail}</p>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function BreakdownBars({
  items,
  nameKey,
  valueKey,
  format = "number",
}: {
  items: ReportBreakdown[];
  nameKey: "status" | "category" | "breed" | "sex" | "payment_status";
  valueKey: "total" | "total_amount" | "total_sales";
  format?: "number" | "money";
}) {
  const rows = items.map((item) => ({
    name: labelize(item[nameKey] as string | undefined),
    value: Number(item[valueKey] ?? 0),
  }));

  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  if (!rows.length) {
    return (
      <p className="py-5 text-sm text-gray-500">
        No data available for this period.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={`${row.name}-${index}`}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-gray-700">{row.name}</span>
            <span className="shrink-0 font-medium text-gray-900">
              {format === "money" ? money(row.value) : number(row.value)}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{
                width: `${Math.max((row.value / maxValue) * 100, row.value > 0 ? 2 : 0)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableEmpty({ columns }: { columns: number }) {
  return (
    <tr>
      <td
        colSpan={columns}
        className="px-4 py-8 text-center text-sm text-gray-500"
      >
        Nothing to display.
      </td>
    </tr>
  );
}

function downloadCsv(report: ReportsOverview) {
  const rows: (string | number)[][] = [
    ["RabbitFarm Manager - Reports & Analytics"],
    ["Start date", report.filters.start_date ?? "All dates"],
    ["End date", report.filters.end_date ?? "All dates"],
    [],
    ["Farm overview"],
    ["Metric", "Value"],
    ["Total rabbits", report.farm.total_rabbits],
    ["Active rabbits", report.farm.active_rabbits],
    ["Total customers", report.customers.total_customers],
    ["Active customers", report.customers.active_customers],
    [],
    ["Sales"],
    ["Metric", "Value (KES or count)"],
    ["Completed sales count", report.sales.total_sales],
    ["Sales value", report.sales.sales_value],
    ["Payments recorded on selected sales", report.sales.payments_recorded_on_sales],
    ["Payments received during period", report.sales.payments_received_in_period],
    ["Outstanding balance on selected sales", report.sales.outstanding_balance],
    ["Rabbits sold", report.sales.rabbits_sold],
    [],
    ["Expenses"],
    ["Expense records", report.expenses.total_expense_records],
    ["Total expenses", report.expenses.total_expenses],
    [],
    ["Preliminary operating summary"],
    ["Sales value", report.operating_summary.sales_value],
    ["Total expenses", report.operating_summary.total_expenses],
    ["Preliminary operating surplus", report.operating_summary.preliminary_operating_surplus],
    ["Note", report.operating_summary.note],
    [],
    ["Breeding and kindling"],
    ["Total breedings", report.breeding.total_breedings],
    ["Completed breedings", report.breeding.completed_breedings],
    ["Confirmed pregnancies", report.breeding.confirmed_pregnancies],
    ["Total kindlings", report.kindlings.total_kindlings],
    ["Kits born", report.kindlings.total_kits_born],
    ["Kits born alive", report.kindlings.kits_born_alive],
    ["Stillborn kits", report.kindlings.stillborn_kits],
    ["Kits weaned", report.kindlings.kits_weaned],
    [],
    ["Expenses by category"],
    ["Category", "Expense records", "Amount (KES)"],
    ...report.expenses.by_category.map((item) => [
      labelize(item.category),
      Number(item.expense_count ?? 0),
      Number(item.total_amount ?? 0),
    ]),
    [],
    ["Rabbit counts by status"],
    ["Status", "Count"],
    ...report.farm.rabbits_by_status.map((item) => [
      labelize(item.status),
      Number(item.total ?? 0),
    ]),
    [],
    ["Low stock items"],
    ["Code", "Item", "Category", "Quantity on hand", "Reorder level", "Unit"],
    ...report.inventory.low_stock_list.map((item) => [
      item.item_code,
      item.name,
      item.category,
      Number(item.quantity_on_hand),
      Number(item.reorder_level),
      item.unit,
    ]),
  ];

  const escapeCsv = (value: string | number) => {
    let text = String(value);
    // Avoid spreadsheet formula execution for text fields.
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rabbitfarm-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadPdf(report: ReportsOverview) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const green: [number, number, number] = [22, 101, 52];
  const lightGreen: [number, number, number] = [236, 253, 245];
  const dark: [number, number, number] = [31, 41, 55];
  const muted: [number, number, number] = [107, 114, 128];

  const period =
    report.filters.start_date || report.filters.end_date
      ? `${report.filters.start_date || "Beginning"} to ${
          report.filters.end_date || "Present"
        }`
      : "All recorded dates";

  // Document title and report metadata.
  doc.setFillColor(...green);
  doc.rect(0, 0, pageWidth, 43, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("RabbitFarm Manager", margin, 17);

  doc.setFontSize(14);
  doc.text("Reports & Analytics", margin, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Reporting period: ${period}`, margin, 34);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-KE")}`,
    pageWidth - margin,
    34,
    { align: "right" },
  );

  let y = 51;

  // Add a styled section heading.
  const addSection = (title: string) => {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...green);
    doc.text(title, margin, y);
    y += 3;
  };

  // Add a consistently styled table and track its final position.
  const addTable = (
    headers: string[],
    rows: (string | number)[][],
    options: {
      columnStyles?: Record<number, { halign?: "left" | "center" | "right"; cellWidth?: number | "auto" | "wrap" }>;
    } = {},
  ) => {
    autoTable(doc, {
      startY: y,
      head: [headers],
      body: rows.length ? rows : [["No records available"]],
      margin: { left: margin, right: margin, bottom: 18 },
      theme: "striped",
      headStyles: {
        fillColor: green,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        textColor: dark,
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: options.columnStyles,
      styles: {
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
        valign: "middle",
      },
    });

    const positionedDoc = doc as typeof doc & {
      lastAutoTable?: { finalY: number };
    };

    y = (positionedDoc.lastAutoTable?.finalY ?? y) + 10;
  };

  // Summary cards represented as a clean table in the PDF.
  addSection("Farm Overview");

  doc.setFillColor(...lightGreen);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "F");

  doc.setTextColor(...dark);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const overviewMetrics = [
    {
      label: "Total Rabbits",
      value: number(report.farm.total_rabbits),
    },
    {
      label: "Active Rabbits",
      value: number(report.farm.active_rabbits),
    },
    {
      label: "Customers",
      value: number(report.customers.total_customers),
    },
    {
      label: "Active Stock Items",
      value: number(report.inventory.active_items),
    },
  ];

  const metricWidth = contentWidth / overviewMetrics.length;

  overviewMetrics.forEach((metric, index) => {
    const x = margin + index * metricWidth + 3;

    doc.setTextColor(...muted);
    doc.text(metric.label, x, y + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...green);
    doc.text(metric.value, x, y + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
  });

  y += 29;

  // Financial summary.
  addSection("Financial Summary");

  addTable(
    ["Metric", "Amount (KES)"],
    [
      ["Completed sales value", money(report.sales.sales_value)],
      [
        "Payments recorded on selected sales",
        money(report.sales.payments_recorded_on_sales),
      ],
      [
        "Payments received during period",
        money(report.sales.payments_received_in_period),
      ],
      [
        "Outstanding balance on selected sales",
        money(report.sales.outstanding_balance),
      ],
      ["Total recorded expenses", money(report.expenses.total_expenses)],
      [
        "Preliminary operating surplus",
        money(report.operating_summary.preliminary_operating_surplus),
      ],
    ],
    { columnStyles: { 1: { halign: "right" } } },
  );

  // Make the financial disclaimer visible in the exported report.
  const disclaimerLines = doc.splitTextToSize(
    report.operating_summary.note,
    contentWidth - 8,
  );

  const disclaimerHeight = Math.max(14, disclaimerLines.length * 4 + 6);

  if (y + disclaimerHeight > pageHeight - 18) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(margin, y, contentWidth, disclaimerHeight, 2, 2, "FD");

  doc.setTextColor(146, 64, 14);
  doc.setFontSize(8);
  doc.text(disclaimerLines, margin + 4, y + 6);

  y += disclaimerHeight + 10;

  // Expense analysis.
  addSection("Expenses by Category");

  addTable(
    ["Category", "Records", "Amount (KES)"],
    report.expenses.by_category.map((item) => [
      labelize(item.category),
      number(item.expense_count),
      money(item.total_amount),
    ]),
    {
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
      },
    },
  );

  addSection("Sales by Payment Status");

  addTable(
    ["Payment Status", "Sales Count", "Sales Value (KES)"],
    report.sales.by_payment_status.map((item) => [
      labelize(item.payment_status),
      number(item.total_sales),
      money(item.total_amount),
    ]),
    {
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
      },
    },
  );

  // Herd breakdowns.
  addSection("Rabbits by Status");

  addTable(
    ["Status", "Rabbit Count"],
    report.farm.rabbits_by_status.map((item) => [
      labelize(item.status),
      number(item.total),
    ]),
    { columnStyles: { 1: { halign: "right" } } },
  );

  addSection("Rabbits by Breed");

  addTable(
    ["Breed", "Rabbit Count"],
    report.farm.rabbits_by_breed.map((item) => [
      labelize(item.breed),
      number(item.total),
    ]),
    { columnStyles: { 1: { halign: "right" } } },
  );

  // Breeding and kindling statistics.
  addSection("Breeding & Kindling");

  addTable(
    ["Metric", "Count"],
    [
      ["Total breedings", number(report.breeding.total_breedings)],
      ["Completed breedings", number(report.breeding.completed_breedings)],
      [
        "Confirmed pregnancies",
        number(report.breeding.confirmed_pregnancies),
      ],
      ["Total kindlings", number(report.kindlings.total_kindlings)],
      ["Kits born", number(report.kindlings.total_kits_born)],
      ["Kits born alive", number(report.kindlings.kits_born_alive)],
      ["Stillborn kits", number(report.kindlings.stillborn_kits)],
      ["Kits currently alive", number(report.kindlings.current_alive_kits)],
      ["Kits weaned", number(report.kindlings.kits_weaned)],
    ],
    { columnStyles: { 1: { halign: "right" } } },
  );

  // Inventory summary and reorder list.
  addSection("Inventory Summary");

  addTable(
    ["Metric", "Value"],
    [
      ["Active inventory items", number(report.inventory.active_items)],
      ["Total quantity on hand", number(report.inventory.total_quantity)],
      [
        "Estimated stock value (KES)",
        money(report.inventory.estimated_stock_value),
      ],
      ["Items requiring reorder", number(report.inventory.low_stock_items)],
    ],
    { columnStyles: { 1: { halign: "right" } } },
  );

  addSection("Low-Stock Alerts");

  addTable(
    ["Item", "Code", "Category", "On Hand", "Reorder Level"],
    report.inventory.low_stock_list.map((item) => [
      item.name,
      item.item_code || "—",
      labelize(item.category),
      `${number(item.quantity_on_hand)} ${item.unit}`,
      `${number(item.reorder_level)} ${item.unit}`,
    ]),
  );

  // Footer and page numbering on every page.
  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);

    doc.setDrawColor(229, 231, 235);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);

    doc.text(
      "RabbitFarm Manager | Confidential farm report",
      margin,
      pageHeight - 7,
    );

    doc.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: "right" },
    );
  }

  const safeDate = new Date().toISOString().slice(0, 10);
  doc.save(`rabbitfarm-report-${safeDate}.pdf`);
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportsOverview | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getReportsOverview(
        startDate || undefined,
        endDate || undefined,
      );
      setReport(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load reports. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const rangeLabel = useMemo(() => {
    if (startDate && endDate) return `${startDate} to ${endDate}`;
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Until ${endDate}`;
    return "All recorded dates";
  }, [startDate, endDate]);

  const resetDates = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />

      <div className="min-w-0 flex-1 lg:ml-64">
        <AppHeader />

        <main className="mx-auto max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Activity size={16} />
                Farm performance
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Reports &amp; Analytics
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Monitor your herd, finances, breeding, and inventory in one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
            <button
                type="button"
                onClick={() => report && downloadCsv(report)}
                disabled={!report || loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Download size={17} />
                Export CSV
            </button>

            <button
                type="button"
                onClick={() => report && downloadPdf(report)}
                disabled={!report || loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <FileText size={17} />
                Export PDF
            </button>
            </div>
          </div>

          <SectionCard
            title="Report filters"
            subtitle="Choose a period for sales, expenses, breeding, and kindling activity."
            action={
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {rangeLabel}
              </span>
            }
          >
            <form
              className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                void loadReport();
              }}
            >
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Start date
                </span>
                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  End date
                </span>
                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Apply filters
              </button>

              <button
                type="button"
                onClick={resetDates}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Clear dates
              </button>
            </form>
          </SectionCard>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Could not load reports</p>
                <p className="mt-1 break-words">{error}</p>
                <p className="mt-2 text-red-700">
                  Confirm that Laravel is running and the reports endpoint is registered.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadReport()}
                className="shrink-0 font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {loading && !report ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-2xl border border-gray-200 bg-white"
                />
              ))}
            </div>
          ) : report ? (
            <>
              {loading && (
                <p className="text-xs text-gray-500" role="status">
                  Refreshing report data…
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Total rabbits"
                  value={number(report.farm.total_rabbits)}
                  detail={`${number(report.farm.active_rabbits)} currently active`}
                  icon={<PawPrint size={21} />}
                  tone="green"
                />
                <MetricCard
                  title="Sales value"
                  value={money(report.sales.sales_value)}
                  detail={`${number(report.sales.total_sales)} completed sales in the selected period`}
                  icon={<ShoppingCart size={21} />}
                  tone="blue"
                />
                <MetricCard
                  title="Payments received"
                  value={money(report.sales.payments_received_in_period)}
                  detail={`${number(report.sales.payment_transactions)} payment transactions during the period`}
                  icon={<Wallet size={21} />}
                  tone="purple"
                />
                <MetricCard
                  title="Outstanding balance"
                  value={money(report.sales.outstanding_balance)}
                  detail="Unpaid balance on completed sales made in the selected period"
                  icon={<DollarSign size={21} />}
                  tone="amber"
                />
                <MetricCard
                  title="Total expenses"
                  value={money(report.expenses.total_expenses)}
                  detail={`${number(report.expenses.total_expense_records)} expense records in the period`}
                  icon={<ArrowDownRight size={21} />}
                  tone="red"
                />
                <MetricCard
                  title="Operating surplus"
                  value={money(report.operating_summary.preliminary_operating_surplus)}
                  detail="Sales value minus recorded expenses; not final accounting profit"
                  icon={
                    report.operating_summary.preliminary_operating_surplus >= 0
                      ? <ArrowUpRight size={21} />
                      : <ArrowDownRight size={21} />
                  }
                  tone={report.operating_summary.preliminary_operating_surplus >= 0 ? "green" : "red"}
                />
                <MetricCard
                  title="Kits born alive"
                  value={number(report.kindlings.kits_born_alive)}
                  detail={`${number(report.kindlings.total_kindlings)} recorded kindlings in the selected period`}
                  icon={<Baby size={21} />}
                  tone="purple"
                />
                <MetricCard
                  title="Low-stock items"
                  value={number(report.inventory.low_stock_items)}
                  detail={`${number(report.inventory.active_items)} active inventory items`}
                  icon={<AlertTriangle size={21} />}
                  tone={report.inventory.low_stock_items > 0 ? "amber" : "green"}
                />
              </div>

              <SectionCard
                title="Preliminary operating summary"
                subtitle="Financial overview for the selected reporting period."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-sm text-blue-800">Completed sales value</p>
                    <p className="mt-2 text-xl font-bold text-blue-950">
                      {money(report.operating_summary.sales_value)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-sm text-red-800">Recorded expenses</p>
                    <p className="mt-2 text-xl font-bold text-red-950">
                      {money(report.operating_summary.total_expenses)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-sm text-emerald-800">Preliminary surplus</p>
                    <p className="mt-2 text-xl font-bold text-emerald-950">
                      {money(report.operating_summary.preliminary_operating_surplus)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  {report.operating_summary.note}
                </p>
              </SectionCard>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <SectionCard
                  title="Rabbits by status"
                  subtitle="Current herd status breakdown."
                >
                  <BreakdownBars
                    items={report.farm.rabbits_by_status}
                    nameKey="status"
                    valueKey="total"
                  />
                </SectionCard>

                <SectionCard
                  title="Expenses by category"
                  subtitle="Recorded expenditure during the selected period."
                >
                  <BreakdownBars
                    items={report.expenses.by_category}
                    nameKey="category"
                    valueKey="total_amount"
                    format="money"
                  />
                </SectionCard>

                <SectionCard
                  title="Sales by payment status"
                  subtitle="Completed sales grouped by their payment status."
                >
                  <BreakdownBars
                    items={report.sales.by_payment_status}
                    nameKey="payment_status"
                    valueKey="total_amount"
                    format="money"
                  />
                </SectionCard>

                <SectionCard
                  title="Rabbits by breed"
                  subtitle="Current rabbit register."
                >
                  <BreakdownBars
                    items={report.farm.rabbits_by_breed}
                    nameKey="breed"
                    valueKey="total"
                  />
                </SectionCard>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <SectionCard
                  title="Breeding & kindling"
                  subtitle="Reproductive activity in the selected period."
                  action={
                    <Egg size={20} className="text-emerald-700" />
                  }
                >
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["Breedings", report.breeding.total_breedings],
                      ["Completed breedings", report.breeding.completed_breedings],
                      ["Confirmed pregnancies", report.breeding.confirmed_pregnancies],
                      ["Kindlings", report.kindlings.total_kindlings],
                      ["Kits born", report.kindlings.total_kits_born],
                      ["Stillborn kits", report.kindlings.stillborn_kits],
                      ["Kits currently alive", report.kindlings.current_alive_kits],
                      ["Kits weaned", report.kindlings.kits_weaned],
                    ].map(([title, value]) => (
                      <div
                        key={String(title)}
                        className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                      >
                        <p className="text-xs leading-5 text-gray-500">
                          {title}
                        </p>
                        <p className="mt-1 text-xl font-bold text-gray-900">
                          {number(value as number)}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Inventory overview"
                  subtitle="Current stock levels and estimated value."
                  action={
                    <Layers3 size={20} className="text-emerald-700" />
                  }
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Active items</p>
                      <p className="mt-1 text-xl font-bold text-gray-900">
                        {number(report.inventory.active_items)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Estimated stock value</p>
                      <p className="mt-1 break-words text-lg font-bold text-gray-900">
                        {money(report.inventory.estimated_stock_value)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Total customers</p>
                      <p className="mt-1 text-xl font-bold text-gray-900">
                        {number(report.customers.total_customers)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Rabbits sold</p>
                      <p className="mt-1 text-xl font-bold text-gray-900">
                        {number(report.sales.rabbits_sold)}
                      </p>
                    </div>
                  </div>
                </SectionCard>
              </div>

              <SectionCard
                title="Low-stock alerts"
                subtitle="Active inventory items at or below their reorder level."
                action={
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      report.inventory.low_stock_items > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {report.inventory.low_stock_items > 0
                      ? `${report.inventory.low_stock_items} need attention`
                      : "Stock levels look good"}
                  </span>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-3 font-medium">Item</th>
                        <th className="px-3 py-3 font-medium">Code</th>
                        <th className="px-3 py-3 font-medium">Category</th>
                        <th className="px-3 py-3 text-right font-medium">On hand</th>
                        <th className="px-3 py-3 text-right font-medium">Reorder level</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.inventory.low_stock_list.length === 0 ? (
                        <TableEmpty columns={6} />
                      ) : (
                        report.inventory.low_stock_list.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-3 py-3 font-medium text-gray-900">
                              {item.name}
                            </td>
                            <td className="px-3 py-3 text-gray-600">
                              {item.item_code}
                            </td>
                            <td className="px-3 py-3 text-gray-600">
                              {labelize(item.category)}
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-gray-900">
                              {number(item.quantity_on_hand)} {item.unit}
                            </td>
                            <td className="px-3 py-3 text-right text-gray-600">
                              {number(item.reorder_level)} {item.unit}
                            </td>
                            <td className="px-3 py-3">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                                <AlertTriangle size={13} />
                                Reorder
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <SectionCard
                title="Customer overview"
                subtitle="Current customer register, independent of the selected report dates."
              >
                <div className="flex flex-wrap gap-4">
                  <div className="flex min-w-48 flex-1 items-center gap-3 rounded-xl border border-gray-100 p-4">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                      <Users size={22} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total customers</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {number(report.customers.total_customers)}
                      </p>
                    </div>
                  </div>
                  <div className="flex min-w-48 flex-1 items-center gap-3 rounded-xl border border-gray-100 p-4">
                    <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Active customers</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {number(report.customers.active_customers)}
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </>
          ) : !error ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
              <Activity className="mx-auto text-gray-400" size={32} />
              <p className="mt-3 font-medium text-gray-900">
                No report data available
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Try refreshing the report.
              </p>
              <button
                type="button"
                onClick={() => void loadReport()}
                className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Reload reports
              </button>
            </div>
          ) : null}

          <footer className="pb-4 text-center text-xs leading-5 text-gray-400">
            Farm totals and inventory show current state. Financial and breeding
            reports use the selected activity dates.
          </footer>
        </main>
      </div>
    </div>
  );
}
