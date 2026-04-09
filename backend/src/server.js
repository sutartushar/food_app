require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { listOrders, createOrder, updateOrderStatus, advanceOrder } = require("./orders");

const app = express();

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/orders", listOrders);
app.post("/api/orders", createOrder);
app.patch("/api/orders/:id/status", updateOrderStatus);
app.post("/api/orders/:id/advance", advanceOrder);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

