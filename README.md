# 🍏 RK Rajak ABS — Fresh Produce & Agro-Distribution Engine

![Architecture Banner](./assets/banner.svg)

<p align="center">
  <a href="https://www.postman.com/shahjalal-backend-9458759/shahjalal-api-portfolio/collection/48491387-bde72b2b-5fa9-40b2-b8f0-473e8b29817e" target="_blank">
    <img src="https://run.pstmn.io/button.svg" alt="View in Postman" />
  </a>
  <a href="https://www.postman.com/shahjalal-backend-9458759/shahjalal-api-portfolio/collection/48491387-bde72b2b-5fa9-40b2-b8f0-473e8b29817e" target="_blank">
    <img src="https://img.shields.io/badge/Postman-Instant_Live_API_Docs-FF6C37?style=for-the-badge&logo=postman&logoColor=white" alt="Live API Documentation" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Agro_Logistics-10B981?style=for-the-badge&logo=leaf&logoColor=white" alt="Agro_Logistics" />
  
</p>

---

## 📌 Executive Overview

RK Rajak ABS Fruits coordinates agricultural supply chain logistics, wholesale crate ordering, perishable batch lifecycle tracking, and cold-storage inventory telemetry.

---

## 🚀 Key Architectural Highlights

- **Batch & Expiry Telemetry**: Perishable inventory management with automated expiry alerts.
- **Wholesale Order Processing**: Dynamic tiered pricing based on bulk quantity thresholds.
- **Dispatch Routing**: Multi-depot distribution planning and vehicle load allocation.
- **Accounting Sync**: Real-time balance ledger tracking for wholesale buyers.
- **Resilient Architecture**: Zero-downtime MongoDB schema indexing via Prisma.

---

## 📬 API Documentation & Interactive Postman Collection

The complete REST API specification is published in our public Postman showcase workspace:

* 🌐 **Instant Live API Documentation**: [Explore RK-Rajak-backend in Postman (Instant Web View)](https://www.postman.com/shahjalal-backend-9458759/shahjalal-api-portfolio/collection/48491387-bde72b2b-5fa9-40b2-b8f0-473e8b29817e)
* 📁 **Local Postman File**: [`docs/postman_collection.json`](./docs/postman_collection.json) (import directly into Postman Desktop or Newman CLI).

### Core Endpoint Modules

| Module | Base Route | Key Capabilities |
|---|---|---|
| **Authentication** | `/api/v1/auth` | Wholesale buyer and depot manager authentication |
| **Products** | `/api/v1/product` | Fresh produce catalog, grade classifications, lot numbers |
| **Orders** | `/api/v1/order` | Wholesale purchase orders, delivery time windows, fulfillment |
| **Depots** | `/api/v1/depot` | Warehouse stock levels, cold storage logs, batch dispatches |

---

## 📂 Project Architecture

```plaintext
RK-Rajak-backend/
├── assets/
│   └── banner.svg               # Project architecture visual banner
├── docs/
│   └── postman_collection.json  # Full Postman API collection v2.1
├── src/
│   ├── app/
│   │   ├── middlewares/         # Global error handlers, auth & validation guards
│   │   ├── modules/             # Domain-driven feature modules
│   │   └── routes/              # Centralized route aggregator
│   ├── config/                  # Environment & external service configurations
│   └── server.ts                # Application bootstrapper & HTTP server
├── prisma/
│   └── schema.prisma            # Database schema definition
├── .env.example                 # Sanitized environment template
├── package.json
└── tsconfig.json
```

---

## 🛠️ Quickstart & Local Setup

### Prerequisites
* **Node.js**: `v20.x` or higher
* **Database**: MongoDB or PostgreSQL (as specified in `schema.prisma`)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/shahjalal-labs/RK-Rajak-backend.git
cd RK-Rajak-backend
npm install
```

### 2. Environment Configuration
Copy the provided `.env.example` file to create your local `.env`:
```bash
cp .env.example .env
```

### 3. Initialize Prisma Client
```bash
npx prisma generate
```

### 4. Run Development Server
```bash
npm run dev
```

---

## 👨‍💻 Engineering & Authorship

Developed and maintained by **Md. Shahjalal**.

* **GitHub**: [@shahjalal-labs](https://github.com/shahjalal-labs)
* **Email**: [muhommodshahjalal@gmail.com](mailto:muhommodshahjalal@gmail.com)

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
