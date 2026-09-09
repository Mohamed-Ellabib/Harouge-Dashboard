import { FormEvent, useMemo, useState } from "react";
import {
  ArrowSquareOut,
  CaretLeft,
  CaretRight,
  CheckCircle,
  ClipboardText,
  Export,
  FunnelSimple,
  MagnifyingGlass,
  Package,
  Plus,
  TrendUp,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

import "./vendor-orders-panel.css";
import { VendorOrderProgressControl, type DeliveryProgress } from "./VendorOrderProgressControl";

export type PortalOrder = {
  fulfillment_progress?: DeliveryProgress;
  id: string;
  display_id: number | string | null;
  status: string;
  email: string | null;
  currency_code: string | null;
  vendor_total: number;
  created_at: string;
  items: Array<{ id: string; title: string; quantity: number }>;
};

type VendorOrdersPanelProps = {
  isDemo: boolean;
  onToast: (message: string) => void;
  orders: PortalOrder[];
  topSearch: string;
};

type OrderStatus = "New" | "Processing" | "Delivered" | "Cancelled";
type OrderFilter = "all" | "new" | "processing" | "delivered" | "cancelled";

type OrderRow = {
  rawId?: string;
  customer: string;
  date: string;
  email?: string;
  id: string;
  items: number;
  status: OrderStatus;
  total: string;
};

const demoRows: OrderRow[] = [
  { id: "#LS-1048", customer: "Amina Khaled", items: 2, total: "LYD 1,280", status: "Processing", date: "Aug 09, 2026", email: "amina@example.com" },
  { id: "#LS-1047", customer: "Omar Ali", items: 1, total: "LYD 760", status: "Delivered", date: "Aug 09, 2026", email: "omar@example.com" },
  { id: "#LS-1046", customer: "Sara Ahmed", items: 3, total: "LYD 2,100", status: "New", date: "Aug 08, 2026", email: "sara@example.com" },
  { id: "#LS-1045", customer: "Mahmoud Saleh", items: 1, total: "LYD 430", status: "Delivered", date: "Aug 08, 2026", email: "mahmoud@example.com" },
  { id: "#LS-1044", customer: "Rania Salem", items: 2, total: "LYD 950", status: "Processing", date: "Aug 07, 2026", email: "rania@example.com" },
  { id: "#LS-1043", customer: "Youssef Omar", items: 1, total: "LYD 610", status: "Cancelled", date: "Aug 07, 2026", email: "youssef@example.com" },
];

const readableStatus = (status: string): OrderStatus => {
  const normalized = status.toLowerCase();
  if (["completed", "delivered", "fulfilled"].includes(normalized)) return "Delivered";
  if (["processing", "pending", "requires_action"].includes(normalized)) return "Processing";
  if (["canceled", "cancelled"].includes(normalized)) return "Cancelled";
  return "New";
};

const filterForStatus = (status: OrderStatus): OrderFilter => status.toLowerCase() as OrderFilter;

const customerFromEmail = (email: string | null) => {
  if (!email) return "Guest customer";
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
};

function OrderKpi({
  helper,
  icon: Icon,
  label,
  onClick,
  primary,
  value,
}: {
  helper: string;
  icon: typeof ClipboardText;
  label: string;
  onClick: () => void;
  primary?: boolean;
  value: number;
}) {
  return (
    <button className={`vendor-orders__kpi ${primary ? "is-primary" : ""}`} onClick={onClick} type="button">
      <span>{label}</span><i><Icon size={22} /></i>
      <strong>{value.toLocaleString("en-US")}</strong>
      <small>{label === "New Orders" ? <WarningCircle size={16} /> : <TrendUp size={15} />}{helper}</small>
    </button>
  );
}

function OrderSummary({ delivered, processing, fresh, percentage }: { delivered: number; processing: number; fresh: number; percentage: number }) {
  return (
    <article className="vendor-orders__summary">
      <header><h2>Order Summary</h2><button aria-label="Open order summary" type="button"><ArrowSquareOut size={17} /></button></header>
      <div className="vendor-orders__gauge" role="img" aria-label={`${percentage}% fulfilled`}><span /><i className="is-start" aria-hidden="true" /><i className="is-end" aria-hidden="true" /><div><strong>{percentage}%</strong><small>Fulfilled</small></div></div>
      <dl>
        <div><dt><i className="is-delivered" />Delivered</dt><dd>{delivered}</dd></div>
        <div><dt><i className="is-processing" />Processing</dt><dd>{processing}</dd></div>
        <div><dt><i className="is-new" />New</dt><dd>{fresh}</dd></div>
      </dl>
    </article>
  );
}

export function VendorOrdersPanel({ isDemo, onToast, orders, topSearch }: VendorOrdersPanelProps) {
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [localQuery, setLocalQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [createdRows, setCreatedRows] = useState<OrderRow[]>([]);
  const [savedStatuses, setSavedStatuses] = useState<Record<string, OrderRow["status"]>>({});

  const apiRows = useMemo<OrderRow[]>(() => orders.map((order) => ({
    rawId: order.id,
    customer: customerFromEmail(order.email),
    date: new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(order.created_at)),
    email: order.email || undefined,
    id: `#${order.display_id ?? order.id.slice(-6)}`,
    items: order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    status: readableStatus(order.fulfillment_progress?.status === "shipped" ? "processing" : order.fulfillment_progress?.status ?? order.status),
    total: `${(order.currency_code || "LYD").toUpperCase()} ${Number(order.vendor_total || 0).toLocaleString("en-US")}`,
  })), [orders]);

  const baseRows = isDemo ? demoRows : apiRows;
  const rows = (isDemo ? [...createdRows, ...baseRows] : baseRows).map(row => row.rawId && savedStatuses[row.rawId] ? { ...row, status: savedStatuses[row.rawId] } : row);
  const normalizedQuery = (localQuery || topSearch).trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    const matchesQuery = !normalizedQuery || row.id.toLowerCase().includes(normalizedQuery) || row.customer.toLowerCase().includes(normalizedQuery) || row.email?.toLowerCase().includes(normalizedQuery);
    const matchesStatus = filter === "all" || filterForStatus(row.status) === filter;
    return matchesQuery && matchesStatus;
  });
  const visibleRows = isDemo ? filteredRows.slice(0, 6) : filteredRows.slice((page - 1) * 6, page * 6);
  const counts = isDemo && !createdRows.length
    ? { total: 326, fresh: 12, processing: 42, delivered: 257 }
    : {
        total: rows.length,
        fresh: rows.filter((row) => row.status === "New").length,
        processing: rows.filter((row) => row.status === "Processing").length,
        delivered: rows.filter((row) => row.status === "Delivered").length,
      };
  const fulfilled = isDemo && !createdRows.length ? 79 : counts.total ? Math.round((counts.delivered / counts.total) * 100) : 0;

  const selectFilter = (nextFilter: OrderFilter) => {
    setFilter(nextFilter);
    setPage(1);
    setShowFilter(false);
  };

  const exportOrders = () => {
    const header = ["Order", "Customer", "Items", "Total", "Status", "Date"];
    const csv = [header, ...filteredRows.map((row) => [row.id, row.customer, String(row.items), row.total, row.status, row.date])]
      .map((columns) => columns.map((column) => `"${column.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "vendor-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
    onToast("Orders exported as CSV.");
  };

  const createOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDemo) { onToast("Orders are created through your store checkout. Manual order entry is not available yet."); return; }
    const data = new FormData(event.currentTarget);
    const customer = String(data.get("customer") || "").trim();
    const email = String(data.get("email") || "").trim();
    const totalValue = Number(data.get("total") || 0);
    const items = Math.max(1, Number(data.get("items") || 1));
    if (!customer || !email || totalValue <= 0) {
      onToast("Complete the customer, email, and total fields.");
      return;
    }
    const number = 1049 + createdRows.length;
    setCreatedRows((current) => [{
      customer,
      date: "Aug 09, 2026",
      email,
      id: `#LS-${number}`,
      items,
      status: "New",
      total: `LYD ${totalValue.toLocaleString("en-US")}`,
    }, ...current]);
    setShowCreate(false);
    selectFilter("all");
    onToast("Manual order added to this dashboard.");
  };

  return (
    <div className="vendor-orders">
      <header className="vendor-orders__header">
        <div><h1>Orders</h1><p>Manage, process and track customer orders.</p></div>
        <div className="vendor-orders__actions"><button className="is-primary" onClick={() => isDemo ? setShowCreate(true) : onToast("Orders are created through your store checkout. Manual order entry is not available yet.")} type="button"><Plus size={21} />Create Order</button><button onClick={exportOrders} type="button"><Export className="vendor-orders__export-icon" size={18} />Export Orders</button></div>
      </header>

      <section className="vendor-orders__kpis">
        <OrderKpi helper="+8.6% this month" icon={ClipboardText} label="Total Orders" onClick={() => selectFilter("all")} primary value={counts.total} />
        <OrderKpi helper="Needs confirmation" icon={Package} label="New Orders" onClick={() => selectFilter("new")} value={counts.fresh} />
        <OrderKpi helper="Ready to prepare" icon={Package} label="Processing" onClick={() => selectFilter("processing")} value={counts.processing} />
        <OrderKpi helper="+18 this week" icon={CheckCircle} label="Delivered" onClick={() => selectFilter("delivered")} value={counts.delivered} />
      </section>

      <section className="vendor-orders__lower">
        <article className="vendor-orders__list-card">
          <div className="vendor-orders__list-title"><h2>All Orders</h2><span>{counts.total} orders</span></div>
          <div className="vendor-orders__toolbar">
            <label><MagnifyingGlass size={18} /><input onChange={(event) => { setLocalQuery(event.target.value); setPage(1); }} placeholder="Search order ID or customer" value={localQuery} /></label>
            <div className="vendor-orders__tabs" role="tablist" aria-label="Order status">
              {([[
                "all", "All"
              ], ["new", "New"], ["processing", "Processing"], ["delivered", "Delivered"], ["cancelled", "Cancelled"]] as Array<[OrderFilter, string]>).map(([value, label]) => <button aria-selected={filter === value} className={filter === value ? "is-active" : ""} key={value} onClick={() => selectFilter(value)} role="tab" type="button">{label}</button>)}
            </div>
            <div className="vendor-orders__filter-wrap"><button className="vendor-orders__filter" onClick={() => setShowFilter((current) => !current)} type="button"><FunnelSimple size={18} />Filter</button>{showFilter ? <div className="vendor-orders__filter-menu"><button onClick={() => selectFilter("new")} type="button">Needs confirmation</button><button onClick={() => selectFilter("processing")} type="button">Preparing now</button><button onClick={() => selectFilter("all")} type="button">Clear filters</button></div> : null}</div>
          </div>

          <div className="vendor-orders__table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th><span className="sr-only">Action</span></th></tr></thead>
              <tbody>
                {visibleRows.map((row) => <tr key={row.id}><td>{row.id}</td><td>{row.customer}</td><td>{row.items} {row.items === 1 ? "item" : "items"}</td><td>{row.total}</td><td><span className={`vendor-orders__status is-${filterForStatus(row.status)}`}>{row.status}</span></td><td>{row.date}</td><td><button aria-label={`Open ${row.id}`} onClick={() => setSelected(row)} type="button"><CaretRight size={15} /></button></td></tr>)}
                {!visibleRows.length ? <tr><td colSpan={7}><div className="vendor-orders__empty">No orders match this filter.</div></td></tr> : null}
              </tbody>
            </table>
          </div>

          <footer className="vendor-orders__footer"><span>Showing {visibleRows.length ? `${(page - 1) * 6 + 1}–${(page - 1) * 6 + visibleRows.length}` : "0"} of {counts.total}</span><nav aria-label="Order pages"><button aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button"><CaretLeft size={15} /></button>{[1, 2, 3].map((value) => <button className={page === value ? "is-active" : ""} key={value} onClick={() => setPage(value)} type="button">{value}</button>)}<span>...</span><button className={page === 55 ? "is-active" : ""} onClick={() => setPage(55)} type="button">55</button><button aria-label="Next page" onClick={() => setPage((value) => Math.min(55, value + 1))} type="button"><CaretRight size={15} /></button></nav></footer>
        </article>

        <aside className="vendor-orders__side">
          <OrderSummary delivered={counts.delivered} fresh={counts.fresh} percentage={fulfilled} processing={counts.processing} />
          <article className="vendor-orders__attention"><h2>Needs Attention</h2><strong>{counts.fresh} New Orders</strong><p>{isDemo ? "7 orders delayed" : `${counts.processing} orders processing`}</p><button onClick={() => selectFilter("new")} type="button">Review Now</button></article>
        </aside>
      </section>

      {showCreate ? <div className="vendor-orders__modal-backdrop" role="presentation"><form aria-labelledby="create-order-title" className="vendor-orders__modal" onSubmit={createOrder}><button aria-label="Close" className="vendor-orders__modal-close" onClick={() => setShowCreate(false)} type="button"><X size={19} /></button><span className="vendor-orders__modal-icon"><ClipboardText size={24} /></span><h2 id="create-order-title">Create Order</h2><p>Add a manual customer order to your working list.</p><label><span>Customer name</span><input autoFocus name="customer" placeholder="Customer name" required /></label><label><span>Email</span><input name="email" placeholder="customer@example.com" required type="email" /></label><div><label><span>Items</span><input defaultValue="1" min="1" name="items" required type="number" /></label><label><span>Total (LYD)</span><input min="1" name="total" placeholder="0" required type="number" /></label></div><button className="vendor-orders__modal-submit" type="submit">Create Order</button></form></div> : null}
      {selected ? <div className="vendor-orders__modal-backdrop" role="presentation"><section aria-labelledby="order-detail-title" className="vendor-orders__modal vendor-orders__detail" role="dialog">
        <button aria-label="Close" className="vendor-orders__modal-close" onClick={() => setSelected(null)} type="button"><X size={19} /></button>
        <span className="vendor-orders__modal-icon"><Package size={24} /></span><h2 id="order-detail-title">{selected.id}</h2><p>{selected.customer} · {selected.email || "No email"}</p>
        <dl><div><dt>Status</dt><dd>{selected.status}</dd></div><div><dt>Items</dt><dd>{selected.items}</dd></div><div><dt>Total</dt><dd>{selected.total}</dd></div><div><dt>Date</dt><dd>{selected.date}</dd></div></dl>
        {!isDemo && selected.rawId ? <VendorOrderProgressControl orderId={selected.rawId} onUpdated={progress => { const status = readableStatus(progress.status === "shipped" ? "processing" : progress.status); setSavedStatuses(current => ({ ...current, [selected.rawId!]: status })); setSelected(current => current ? { ...current, status } : null); onToast("Delivery progress saved. Customers can see the updated status."); }} /> : null}
        <button className="vendor-orders__modal-submit" onClick={() => setSelected(null)} type="button">Done</button>
      </section></div> : null}
    </div>
  );
}
