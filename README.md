# ⚡ RK Rajak ABS — Hyperlocal Quick-Commerce & Driver Fleet Delivery Dispatch Engine

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
  <img src="https://img.shields.io/badge/Quick_Commerce-10B981?style=for-the-badge&logo=shoppingcart&logoColor=white" alt="Quick_Commerce" />
  <img src="https://img.shields.io/badge/Fleet_Dispatch-3B82F6?style=for-the-badge&logo=truck&logoColor=white" alt="Fleet_Dispatch" />
  
</p>

---

## 📌 Executive Overview

**RK Rajak ABS Backend** is an enterprise quick-commerce and delivery fleet orchestration platform. Engineered with **Node.js, TypeScript, Express, and Prisma ORM**, the system coordinates rapid hyperlocal grocery fulfillment across multi-branch distribution hubs: **catalog variations & handling fees**, **automated driver order assignment**, **driver tiered incentive milestones**, agent commission tracking, digital customer wallet with recharge and interactive spin rewards, and financial cash-clearance settlement logs.

---

## 🚀 Key Architectural & Domain Capabilities

- **Multi-Branch Fulfillment Routing**: Dynamic inventory dispatch mapped to regional branch hubs with handling fee calculations.
- **Driver Fleet Assignment & Dues Clearing**: Automated delivery driver dispatching, transit telemetry, and cash-on-delivery settlement logs (`ClearDuesLog`).
- **Tiered Driver Incentive Engine**: Automated milestone progress tracking (`DriverIncentiveProgress`) rewarding drivers based on completed order quotas.
- **Customer Digital Wallet & Spin Rewards**: Integrated prepaid wallet, balance recharges, transaction audit ledgers, and gamified spin rewards.
- **Marketing Banners & Visual Merchandising**: Dynamic vertical and horizontal promotional banners with slider scheduling.

---

## 📬 API Documentation & Interactive Postman Collection

The complete REST API specification is published in our public Postman showcase workspace:

* 🌐 **Instant Live API Documentation**: [Explore RK-Rajak-backend in Postman (Instant Web View)](https://www.postman.com/shahjalal-backend-9458759/shahjalal-api-portfolio/collection/48491387-bde72b2b-5fa9-40b2-b8f0-473e8b29817e)
* 📁 **Local Postman File**: [`docs/postman_collection.json`](./docs/postman_collection.json) (ready for Postman Desktop or Newman CLI).

### Core Endpoint Modules

| Module | Base Route | Key Capabilities |
|---|---|---|
| **Authentication & Access** | `/api/v1/auth` | Customer, branch manager, agent, and driver authentication with RBAC |
| **Product Catalog** | `/api/v1/product` | Product variations, categories, subcategories, inventory levels |
| **Daily Orders** | `/api/v1/order` | Order placement, variation pricing, branch routing, fulfillment state machine |
| **Driver Fleet Dispatch** | `/api/v1/driverAssignment` | Order allocation to drivers, delivery confirmation, COD clearance |
| **Driver & Agent Incentives** | `/api/v1/incentive` | Milestone targets, completed order quotas, incentive payout progress |
| **Wallet & Recharges** | `/api/v1/wallet` | Prepaid balance, recharge transactions, payment gateway sync |
| **Gamified Spin** | `/api/v1/spin` | Spin-the-wheel rewards, promotional discount credits, winning rates |

---

## 📂 Project Architecture

```plaintext
RK-Rajak-backend/
├── assets/
│   └── banner.svg               # Architectural visual banner
├── docs/
│   └── postman_collection.json  # Full Postman API collection v2.1
├── src/
│   ├── app/
│   │   ├── middlewares/         # Global error handlers, auth & validation guards
│   │   ├── modules/             # Domain feature modules
│   │   └── routes/              # Centralized route registration
│   ├── config/                  # Environment & external service configurations
│   └── server.ts                # Application bootstrapper
├── prisma/
│   └── schema.prisma            # Prisma database schema definition
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

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Run Development Server
```bash
npm run dev
```

---

## 👨‍💻 Engineering & Authorship

Developed and engineered by **Md. Shahjalal**.

* **GitHub**: [@shahjalal-labs](https://github.com/shahjalal-labs)
* **Email**: [muhommodshahjalal@gmail.com](mailto:muhommodshahjalal@gmail.com)

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
