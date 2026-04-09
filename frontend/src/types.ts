export type OrderStatus = "Preparing" | "Ready" | "Completed";

export type OrderItem = {
  name: string;
  qty: number;
};

export type Order = {
  id: number;
  customerName: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt?: string;
  updatedAt?: string;
};

