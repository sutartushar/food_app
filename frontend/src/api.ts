import type { Order, OrderItem, OrderStatus } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? "/api" : "/_/backend/api");

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const message =
      (json && typeof json === "object" && "error" in json && typeof (json as any).error === "string"
        ? (json as any).error
        : `Request failed (${res.status})`) as string;
    throw new Error(message);
  }
  return json as T;
}

export async function listOrders(): Promise<Order[]> {
  const data = await api<{ orders: Order[] }>("/orders");
  return data.orders;
}

export async function createOrder(input: { customerName: string; items: OrderItem[] }): Promise<Order> {
  const data = await api<{ order: Order }>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.order;
}

export async function advanceOrder(id: number): Promise<OrderStatus> {
  const data = await api<{ ok: true; id: number; status: OrderStatus }>(`/orders/${id}/advance`, {
    method: "POST",
  });
  return data.status;
}

export async function setOrderStatus(id: number, status: OrderStatus): Promise<OrderStatus> {
  const data = await api<{ ok: true; id: number; status: OrderStatus }>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return data.status;
}

