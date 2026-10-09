# KisanSetu Architecture Documentation

## 1. System Overview

**KisanSetu** is a smart agricultural procurement and live queue management system built to eliminate farmer waiting time at government and APMC procurement centres (mandis). It introduces AI-driven waiting-time predictions, capacity-balanced slot allocation, emergency priority queues for perishable produce, and end-to-end transparency from arrival to Direct Benefit Transfer (DBT) bank settlement.

```mermaid
graph TD
    Client[React.js Frontend (Vite) :5173] -->|REST APIs + JWT| NodeBackend[Node.js / Express Backend :5000]
    NodeBackend -->|MySQL Driver / Transactions| MySQLDB[(MySQL Database :3306)]
    NodeBackend -->|HTTP POST /predict| AIService[Python AI Service :8000]
    NodeBackend -->|Push Notifications| FCM[Firebase Cloud Messaging / In-App Engine]
```

---

## 2. Component Architecture

### 2.1 React.js Frontend (`port 5173`)
- **Framework**: Vite + React 18, React Router v6.
- **State & Context**:
  - `AuthContext`: Strictly enforces role-based session states (`FARMER` vs `ADMIN`).
  - `LanguageContext`: Provides instantaneous trilingual switching across English (`en`), Hindi (`hi`), and Marathi (`mr`).
  - `NotificationContext`: Real-time notification synchronization with 10-second polling.
- **UI Design System**:
  - High-aesthetic agricultural theme featuring deep emerald greens (`#064e3b`, `#047857`, `#10b981`), warm harvest ambers, glassmorphism cards, and Google Fonts (`Outfit` + `Plus Jakarta Sans`).
  - Strict 12-hour AM/PM time formatting across all time displays.
  - Dual unit input: Metric Kilograms (`kg`) and Quintals (`q`), where `1 quintal = 100 kg`.

### 2.2 Node.js & Express Backend (`port 5000`)
- **Architecture**: Modular controller-service-repository pattern.
- **Security**:
  - `bcryptjs` password hashing with salt rounds.
  - JWT tokens with role payloads and expiration.
  - Strict role-based middleware (`requireFarmer`, `requireAdmin`).
  - Centralized error shielding (no database credential or internal stack leakages).
- **Concurrency & Transactions**:
  - All critical booking and capacity operations execute inside atomic MySQL transactions with `FOR UPDATE` row locks to prevent race conditions and overbooking.

### 2.3 Python AI Service (`port 8000`)
- **Engine**: Flask REST API using Scikit-Learn Ridge Regression with multi-factor heuristic calibration.
- **Input Parameters**:
  - `farmers_ahead`: Queue position.
  - `active_counters`: Operational intake counters at the centre.
  - `avg_processing_mins`: Baseline processing speed per counter.
  - `produce_quantity_kg`: Volume of harvest being weighed.
  - `urgency`: Priority rating (`NORMAL`, `URGENT`, `EMERGENCY`).
  - `perishability`: Produce perishability (`LOW`, `MEDIUM`, `HIGH`).
  - `hour_of_day`: Mandi peak-traffic congestion overhead.
- **Failover / Fallback**:
  - If the Python microservice is offline or times out (2.5s), the Node.js backend seamlessly defaults to a calibrated statistical formula so user experience remains completely uninterrupted.

### 2.4 Permanent MySQL Database (`port 3306`)
- **Database Name**: `kisansetu`
- **Engine**: InnoDB (Foreign Keys, Transactions, ACID Compliance, Row-Level Locking).
- **Entities**: Users, Farmers, Admins, Centres, Centre Slots, Farmer Produce, Bookings, Tokens, Queue Entries, Quality Tests, Procurements, Payments, Notifications.

---

## 3. Core Business Logic & Workflows

### 3.1 Smart Slot Allocation Algorithm
1. Evaluates all active time slots configured for the chosen procurement centre on the requested date.
2. Checks remaining daily capacity (both farmer count limit and total produce metric kg limit).
3. Evaluates each individual slot's remaining farmer headcount and kg headroom.
4. Computes a multi-factor score:
   - Workload leveling (penalizes heavily booked slots to distribute farmers evenly).
   - Morning preference for perishable or urgent crops.
5. Returns a highlighted recommendation alongside the full selectable slot grid.

### 3.2 Emergency Booking Engine
- Strictly tied to the **currently logged-in farmer**.
- Produce **MUST** be verified as `HIGH` perishability and `EMERGENCY` or `URGENT` urgency.
- Emergency bookings draw from a **reserved subset quota** of the centre's capacity.
- Under no circumstances can emergency bookings push total centre utilization beyond absolute maximum daily limits.
- Generates a prioritized digital token (score 50 vs normal 100) ensuring accelerated intake.

### 3.3 Live Queue Lifecycle
```
BOOKED ──> CHECKED_IN ──> WAITING ──> IN_PROGRESS ──> QUALITY_TESTING ──> PROCUREMENT ──> COMPLETED
  │                                                                                           │
  └──> CANCELLED / NO_SHOW                                                         DBT Payment Release
```
