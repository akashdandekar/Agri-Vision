# KisanSetu – Smart Agricultural Procurement Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Database](https://img.shields.io/badge/Database-MySQL_Permanent_Storage-blue.svg)](https://www.mysql.com/)
[![Backend](https://img.shields.io/badge/Backend-Node.js_Express-green.svg)](https://nodejs.org/)
[![AI Service](https://img.shields.io/badge/AI_Engine-Python_Ridge_Regression-amber.svg)](https://scikit-learn.org/)
[![Frontend](https://img.shields.io/badge/Frontend-React_18_Vite-cyan.svg)](https://vitejs.dev/)

**KisanSetu** is an enterprise-grade Smart Agricultural Procurement Management System engineered to eliminate farmer waiting time at agricultural procurement centres (mandis). It features AI-powered waiting time estimation, capacity-balanced smart slot allocation, emergency priority booking for perishable produce, digital queue token passes, quality testing terminals, digital weighbridges, and transparent Direct Benefit Transfer (DBT) bank settlement tracking.

---

## 🌟 Key Features

* **Strict Role-Based Portals**: Completely decoupled Farmer (`/farmer/login`) and Administrator (`/admin/login`) interfaces with backend-enforced JWT authorization.
* **Metric Quantity & Dual Units**: Full native support for Kilograms (`kg`) and Quintals (`quintal`), where `1 quintal = 100 kg`. Automatic internal normalization to kg for capacity calculations.
* **12-Hour AM/PM Time Format**: All farmer and officer time slots and operating windows are strictly presented in standard 12-hour AM/PM format (e.g. `09:00 AM – 09:30 AM`).
* **Centre Capacity Balancing**: Real-time capacity validation taking into account **both farmer headcounts and metric produce weights (kg)** across daily and slot levels.
* **Smart Slot Allocation Engine**: Intelligent algorithm that evaluates centre congestion, crop perishability, and operating windows to recommend the lowest-wait time slot.
* **Emergency Perishable Quota**: Reserved subset quota of centre capacity strictly allocated for perishable crops (e.g. fresh tomatoes) facing post-harvest spoilage.
* **Concurrency & Double-Booking Protection**: Atomic MySQL transactions with `FOR UPDATE` row-level locks that prevent concurrent overbooking or duplicate active bookings on the same date.
* **Sequential Digital Tokens**: Unique digital passes (`T001`, `T002`, `T003`...) ordered by date, priority score, slot time, and sequence number.
* **Live Queue Radar**: Real-time queue tracker showing farmer token, currently serving counter, farmers ahead, and AI predicted waiting time.
* **Separate Python AI Microservice (`port 8000`)**: Scikit-Learn Ridge Regression model estimating waiting times based on queue depth, counter throughput, crop volume, and mandi peak hours, with automatic statistical failover.
* **End-to-End Procurement Lifecycle**:
  `Booking Confirmed ──> Gate Check-in ──> Live Queue ──> Quality Inspection (Grade A/B/C) ──> Digital Weighbridge ──> DBT Settlement`
* **Trilingual Multilingual UI**: Instantaneous translation across **English**, **Hindi (हिन्दी)**, and **Marathi (मराठी)**.
* **Permanent Persistent Storage**: Full MySQL schema with foreign keys, constraints, and relational integrity. No in-memory arrays or JSON storage.

---

## 🏗️ System Architecture

```
React.js Frontend (Vite :5173) ──> Node.js/Express Backend (:5000) ──> MySQL Database (:3306)
                                        │
                                        ├──> Python AI Service (:8000)
                                        └──> Firebase Cloud Messaging / In-App Engine
```

---

## 📁 Project Structure

```
d:/farmer/
├── frontend/                     # React.js (Vite) Application
│   ├── public/
│   ├── src/
│   │   ├── components/           # Navbar, Sidebar, TokenCard, LiveQueueTracker, Badge, ProtectedRoute
│   │   ├── context/              # AuthContext, LanguageContext, NotificationContext
│   │   ├── i18n/                 # en.json, hi.json, mr.json
│   │   ├── pages/
│   │   │   ├── Home.jsx          # Public landing portal
│   │   │   ├── farmer/           # Login, Register, Dashboard, Produce, Booking, Queue, Procurement, Notifications
│   │   │   └── admin/            # Login, Dashboard, Centres, Bookings, Queue, Quality, Procurement, Payments, Analytics
│   │   ├── services/             # Axios API client with auth interceptors
│   │   ├── utils/                # timeFormatter (12-hr AM/PM), unitConverter (kg <-> quintal)
│   │   ├── App.jsx               # Main routing & protected route guards
│   │   ├── index.css             # Rich agricultural design system tokens
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
├── backend/                      # Node.js & Express REST Backend
│   ├── src/
│   │   ├── config/               # db.js (MySQL pool & transactions), firebase.js (FCM adapter)
│   │   ├── controllers/          # auth, produce, centre, slot, booking, queue, quality, procurement, payment, admin, ai
│   │   ├── middleware/           # authMiddleware, errorHandler
│   │   ├── routes/               # Modular Express API routes
│   │   ├── services/             # aiService, notificationService, slotRecommendationService
│   │   ├── app.js                # Express app setup & CORS
│   │   └── server.js             # Database test & server listener
│   ├── test_e2e.js               # 15-suite automated end-to-end integration test
│   ├── .env                      # Environment configurations
│   ├── .env.example
│   └── package.json
│
├── ai-service/                   # Python AI Microservice (Port 8000)
│   ├── app.py                    # Flask REST API endpoints (/health, /predict)
│   ├── model.py                  # Scikit-Learn Ridge Regression model with queue heuristics
│   ├── requirements.txt
│   └── README.md
│
├── database/                     # MySQL Database DDL & Seed
│   ├── schema.sql                # Complete relational schema (13 tables, indexes, constraints)
│   ├── seed.sql                  # Comprehensive demo seed data
│   └── init_db.js                # Automated database creation & bcrypt seeding script
│
├── docs/                         # Detailed Architectural Documentation
│   ├── architecture.md
│   ├── api.md
│   └── database.md
│
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start & Running All Services

### 1. Prerequisites
- **Node.js**: v18+ (verified on v24)
- **Python**: v3.10+ (verified on v3.12)
- **MySQL / MariaDB**: Running on port `3306`

### 2. Initialize Permanent MySQL Database
Make sure MySQL is running on `localhost:3306`.
```bash
# From workspace root
node database/init_db.js
```
This automatically:
1. Creates the `kisansetu` database if not exists.
2. Executes `schema.sql`.
3. Seeds administrator, demo farmers, centres, produce, tokens, and live queues with real bcrypt password hashes.

### 3. Start Python AI Service (`port 8000`)
```bash
# Terminal 1: AI Service
python ai-service/app.py
```
*Health Check: `http://localhost:8000/health`*

### 4. Start Node.js Backend Server (`port 5000`)
```bash
# Terminal 2: Backend
cd backend
npm install
node src/server.js
```
*Health Check: `http://localhost:5000/api/health`*

### 5. Start React Frontend (`port 5173`)
```bash
# Terminal 3: Frontend
cd frontend
npm install
npm run dev -- --port 5173 --host
```
*Application URL: `http://localhost:5173/`*

---

## 🔑 Demo Login Credentials

KisanSetu includes pre-configured seed accounts for immediate evaluation:

| Role | Name | Identifier / Mobile | Password | Location / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Dr. Rajesh Deshmukh | `admin@kisansetu.gov.in` (or `9876543210`) | `admin123` | Senior Officer, Pune APMC Hub |
| **FARMER** | Ramesh Patil | `9123456780` | `farmer123` | Baramati, Pune (Marathi preference) |
| **FARMER** | Suresh Sharma | `9123456781` | `farmer123` | Karnal, Haryana (Hindi preference) |
| **FARMER** | Anita Devi | `9123456782` | `farmer123` | Sehore, Madhya Pradesh (English preference) |

> Both login pages feature **one-click demo autofill buttons** for rapid testing.

---

## 🧪 Automated End-to-End Verification

KisanSetu includes a 15-suite comprehensive integration test covering all critical paths:

```bash
cd backend
node test_e2e.js
```

**Verification Results:**
* `1️⃣ Backend & AI Health Check`: Passed
* `2️⃣ Farmer Authentication`: Passed
* `3️⃣ Admin Authentication`: Passed
* `4️⃣ Role Boundary Security (403 Forbidden)`: Passed
* `5️⃣ Produce Management with Quintal <-> kg conversion`: Passed
* `6️⃣ Centres & Capacities Query (12-hr AM/PM)`: Passed
* `7️⃣ Smart Slot Allocation Recommendation Engine`: Passed
* `8️⃣ Emergency Booking Transaction & Priority Token`: Passed
* `9️⃣ Gate Arrival Check-in`: Passed
* `🔟 Live Queue Radar & AI Wait-Time Prediction`: Passed
* `1️⃣1️⃣ Admin Call Next Token to Counter`: Passed
* `1️⃣2️⃣ Crop Quality Inspection (Grade A Certified)`: Passed
* `1️⃣3️⃣ Digital Weighbridge Weighment & Valuation`: Passed
* `1️⃣4️⃣ DBT Bank Settlement Release`: Passed
* `1️⃣5️⃣ Database Notifications Stored & Verified`: Passed

---

## 🌐 Multilingual Support

The interface natively supports 3 languages configured under `frontend/src/i18n/`:
* **English (`en.json`)**
* **Hindi / हिन्दी (`hi.json`)**
* **Marathi / मराठी (`mr.json`)**

Switch languages instantly using the globe selector in the top navigation bar. Farmer language preferences are persisted permanently in the MySQL database.
#   A g r i - V i s i o n  
 