const { z } = require("zod");
const { pool } = require("./db");

const STATUSES = ["Preparing", "Ready", "Completed"];
const NEXT_STATUS = {
  Preparing: "Ready",
  Ready: "Completed",
  Completed: null,
};

const createOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        qty: z.number().int().positive().max(999),
      })
    )
    .min(1),
});

async function listOrders(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, customer_name AS customerName, items_json AS items, status, created_at AS createdAt, updated_at AS updatedAt FROM orders ORDER BY created_at DESC"
    );
    // mysql2 returns JSON columns as strings in some configs; normalize to objects if needed.
    const normalized = rows.map((r) => ({
      ...r,
      items: typeof r.items === "string" ? JSON.parse(r.items) : r.items,
    }));
    res.json({ orders: normalized });
  } catch (err) {
    next(err);
  }
}

async function createOrder(req, res, next) {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    }

    const { customerName, items } = parsed.data;
    const itemsJson = JSON.stringify(items);

    const [result] = await pool.execute(
      "INSERT INTO orders (customer_name, items_json, status) VALUES (:customerName, CAST(:itemsJson AS JSON), 'Preparing')",
      { customerName, itemsJson }
    );

    res.status(201).json({
      order: {
        id: result.insertId,
        customerName,
        items,
        status: "Preparing",
      },
    });
  } catch (err) {
    next(err);
  }
}

const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
});

async function updateOrderStatus(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
  }

  const desired = parsed.data.status;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute("SELECT status FROM orders WHERE id = :id FOR UPDATE", { id });
    if (!rows || rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    const current = rows[0].status;
    const allowedNext = NEXT_STATUS[current];

    if (desired !== allowedNext) {
      await conn.rollback();
      return res.status(409).json({
        error: "Invalid status transition",
        currentStatus: current,
        allowedNextStatus: allowedNext,
      });
    }

    await conn.execute("UPDATE orders SET status = :desired WHERE id = :id", { desired, id });
    await conn.commit();

    res.json({ ok: true, id, status: desired });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    next(err);
  } finally {
    conn.release();
  }
}

async function advanceOrder(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute("SELECT status FROM orders WHERE id = :id FOR UPDATE", { id });
    if (!rows || rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    const current = rows[0].status;
    const nextStatus = NEXT_STATUS[current];
    if (!nextStatus) {
      await conn.rollback();
      return res.status(409).json({ error: "Order already completed", currentStatus: current });
    }

    await conn.execute("UPDATE orders SET status = :nextStatus WHERE id = :id", { nextStatus, id });
    await conn.commit();
    res.json({ ok: true, id, status: nextStatus });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    next(err);
  } finally {
    conn.release();
  }
}

module.exports = {
  listOrders,
  createOrder,
  updateOrderStatus,
  advanceOrder,
  STATUSES,
};

