import { useEffect, useMemo, useState } from "react";
import type { Order, OrderItem, OrderStatus } from "./types";
import { advanceOrder, createOrder, listOrders, setOrderStatus } from "./api";
import "./style.css";

const STATUS_ORDER: OrderStatus[] = ["Preparing", "Ready", "Completed"];
const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  Preparing: "Ready",
  Ready: "Completed",
  Completed: null,
};

function formatItems(items: OrderItem[]) {
  return items.map((i) => `${i.qty}× ${i.name}`).join(", ");
}

export function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [itemsText, setItemsText] = useState("Burger x1\nFries x2");
  const [creating, setCreating] = useState(false);

  const grouped = useMemo(() => {
    const by: Record<OrderStatus, Order[]> = { Preparing: [], Ready: [], Completed: [] };
    for (const o of orders) by[o.status].push(o);
    return by;
  }, [orders]);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const data = await listOrders();
      setOrders(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function parseItems(text: string): OrderItem[] {
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        // Accept: "Burger x2" OR "Burger 2" OR "Burger"
        const m = line.match(/^(.*?)(?:\s*[xX]\s*(\d+)|\s+(\d+))?$/);
        const name = (m?.[1] ?? line).trim();
        const qtyRaw = m?.[2] ?? m?.[3];
        const qty = qtyRaw ? Number(qtyRaw) : 1;
        return { name, qty };
      })
      .filter((i) => i.name.length > 0 && Number.isFinite(i.qty) && i.qty > 0);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const items = parseItems(itemsText);
    if (!customerName.trim()) {
      setError("Customer name is required");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one item");
      return;
    }
    setCreating(true);
    try {
      const created = await createOrder({ customerName: customerName.trim(), items });
      setOrders((prev) => [created, ...prev]);
      setCustomerName("");
      setItemsText("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to create order");
    } finally {
      setCreating(false);
    }
  }

  async function onAdvance(order: Order) {
    setError(null);
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    // Optimistic
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
    try {
      await advanceOrder(order.id);
    } catch (e: any) {
      // rollback + refresh for safety
      await refresh();
      setError(e?.message ?? "Failed to advance status");
    }
  }

  async function onSetStatus(order: Order, status: OrderStatus) {
    setError(null);
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    try {
      await setOrderStatus(order.id, status);
    } catch (e: any) {
      await refresh();
      setError(e?.message ?? "Failed to update status");
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <div className="brand__title">Food Orders</div>
          <div className="brand__sub">Preparing → Ready → Completed</div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => void refresh()} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Create order</h2>
          <form onSubmit={(e) => void onCreate(e)} className="form">
            <label className="label">
              Customer name
              <input
                className="input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Mia"
              />
            </label>
            <label className="label">
              Items (one per line, e.g. “Burger x2”)
              <textarea
                className="textarea"
                value={itemsText}
                onChange={(e) => setItemsText(e.target.value)}
                placeholder={"Burger x1\nFries x2"}
                rows={6}
              />
            </label>
            <button className="btn btn--primary" type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </button>
          </form>
          {error ? <div className="error">{error}</div> : null}
        </div>

        <div className="board">
          {STATUS_ORDER.map((status) => (
            <div className="column" key={status}>
              <div className="column__head">
                <h2>{status}</h2>
                <span className="pill">{grouped[status].length}</span>
              </div>

              {loading ? (
                <div className="muted">Loading…</div>
              ) : grouped[status].length === 0 ? (
                <div className="muted">No orders</div>
              ) : (
                <div className="list">
                  {grouped[status].map((o) => {
                    const next = NEXT_STATUS[o.status];
                    return (
                      <div className="order" key={o.id}>
                        <div className="order__top">
                          <div className="order__id">#{o.id}</div>
                          <div className="order__name">{o.customerName}</div>
                        </div>
                        <div className="order__items">{formatItems(o.items)}</div>
                        <div className="order__actions">
                          {next ? (
                            <button className="btn btn--small btn--primary" onClick={() => void onAdvance(o)}>
                              Advance → {next}
                            </button>
                          ) : (
                            <span className="muted">Done</span>
                          )}
                          <div className="split" />
                          <select
                            className="select"
                            value={o.status}
                            onChange={(e) => void onSetStatus(o, e.target.value as OrderStatus)}
                            title="Set status (must follow flow)"
                          >
                            {STATUS_ORDER.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

