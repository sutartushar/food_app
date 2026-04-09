## Food delivery (restaurant orders)

System to manage restaurant food orders with a fixed status flow:
**Preparing → Ready → Completed**.

### Tech
- **Backend**: Node.js + Express + MySQL
- **Frontend**: React + Vite + TypeScript

### Features
- **Create order**
- **View all orders**
- **Update order status** (enforced flow)

### Setup

#### 1) Database (MySQL)
Create the database + table:

```sql
-- run this in MySQL client
SOURCE backend/sql/schema.sql;
```

#### 2) Backend

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Backend will run on `http://localhost:8080`.

#### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173` and proxies API calls to the backend.

### API
- **GET** `/api/orders` – list all orders
- **POST** `/api/orders` – create order
- **PATCH** `/api/orders/:id/status` – set status (must be next status)
- **POST** `/api/orders/:id/advance` – advance to next status

### Notes
- **Status transitions are strictly forward-only** and validated in the backend with a transaction + row lock.

