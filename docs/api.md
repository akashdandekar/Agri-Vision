# KisanSetu REST API Specification

Base URL: `http://localhost:5000/api`

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/farmer/register`
Register a new farmer account.
- **Request Body**:
  ```json
  {
    "phone": "9123456780",
    "password": "farmer123",
    "fullName": "Ramesh Patil",
    "village": "Baramati",
    "district": "Pune",
    "state": "Maharashtra",
    "landAcres": 8.5,
    "bankAccountNo": "987123456001",
    "bankIfsc": "SBIN0001234",
    "preferredLanguage": "mr"
  }
  ```
- **Response**: `201 Created` with JWT token and user profile.

### `POST /api/auth/farmer/login`
Farmer login. Strictly verifies `FARMER` role.
- **Request Body**: `{"phone": "9123456780", "password": "farmer123"}`
- **Response**: `200 OK` with JWT token and profile. Returns `403` if attempted with Admin credentials.

### `POST /api/auth/admin/login`
Admin official login. Strictly verifies `ADMIN` role.
- **Request Body**: `{"identifier": "admin@kisansetu.gov.in", "password": "admin123"}`
- **Response**: `200 OK` with JWT token and official profile. Returns `403` if attempted with Farmer credentials.

### `GET /api/auth/me`
Returns currently logged-in user profile with role-specific details.
- **Headers**: `Authorization: Bearer <token>`

---

## 2. Produce Endpoints (`/api/produce`)

### `GET /api/produce`
List all produce belonging to the authenticated farmer.
- **Headers**: `Authorization: Bearer <farmer_jwt>`

### `POST /api/produce`
Add new harvest produce. Converts quintal to kg internally (`1 quintal = 100 kg`).
- **Request Body**:
  ```json
  {
    "cropName": "Soybean (JS 335)",
    "quantity": 25.0,
    "unit": "quintal",
    "harvestDate": "2026-10-05",
    "perishability": "MEDIUM",
    "urgency": "NORMAL",
    "description": "Standard yellow seed variety"
  }
  ```

### `PUT /api/produce/:id` & `DELETE /api/produce/:id`
Modify or delete produce record (only available if produce has not yet been booked or procured).

---

## 3. Centres & Slots Endpoints (`/api/centres`, `/api/slots`)

### `GET /api/centres`
List all active procurement centres. All operating times returned in 12-hour AM/PM format.

### `GET /api/slots/centre/:centreId?date=YYYY-MM-DD&produceQuantityKg=1000`
Fetch all operational slots with real-time remaining capacity (farmers count and produce kg).

### `GET /api/slots/recommend?centreId=1&date=YYYY-MM-DD&produceQuantityKg=2500&urgency=NORMAL&perishability=MEDIUM`
Returns AI/heuristic Smart Slot Allocation recommendation with lowest expected congestion.

---

## 4. Bookings Endpoints (`/api/bookings`)

### `POST /api/bookings/regular`
Atomic booking creation with MySQL `FOR UPDATE` transaction lock.
- **Request Body**:
  ```json
  {
    "produceId": 1,
    "centreId": 1,
    "slotId": 3,
    "bookingDate": "2026-10-12"
  }
  ```
- **Response**: `201 Created` with unique booking reference and digital token (e.g. `T001`).

### `POST /api/bookings/emergency`
Priority emergency booking for perishable crops (`HIGH` perishability and `EMERGENCY` urgency).
- **Request Body**:
  ```json
  {
    "produceId": 2,
    "centreId": 1,
    "bookingDate": "2026-10-12",
    "reason": "Perishable ripe tomato harvest"
  }
  ```

### `GET /api/bookings/my`
List all bookings for current farmer.

---

## 5. Live Queue Endpoints (`/api/queue`)

### `GET /api/queue/status/:bookingId`
Live radar endpoint returning farmer token, currently serving token, people ahead, and AI predicted waiting time in minutes.

### `GET /api/queue/centre/:centreId?date=YYYY-MM-DD`
Full centre queue roster ordered by priority score, slot time, and sequence number.

### `POST /api/queue/checkin`
Gate check-in for arriving farmers. Changes queue status to `WAITING`.

### `POST /api/queue/call-next` (Admin Only)
Calls next token to specified counter. Changes status to `IN_PROGRESS` and sends push notification.

### `POST /api/queue/no-show` (Admin Only)
Marks farmer no-show and releases produce back to `AVAILABLE`.

---

## 6. Quality Testing Endpoints (`/api/quality`)

### `POST /api/quality/start` (Admin Only)
Marks testing in progress.

### `POST /api/quality/submit` (Admin Only)
Submits test result (`PASSED` or `REJECTED`, Grade A/B/C, moisture %, foreign matter %). Auto-routes passed produce to procurement weighbridge.

---

## 7. Procurement & Payments Endpoints (`/api/procurement`, `/api/payments`)

### `POST /api/procurement/complete` (Admin Only)
Records gross weight, tare weight, net weight, rate per kg, and total valuation. Auto-creates pending DBT payment order.

### `PUT /api/payments/:paymentId/status` (Admin Only)
Updates payment status (`PROCESSING`, `PAID`, `FAILED`), records DBT bank transaction reference number, and alerts farmer.

---

## 8. Admin Intelligence (`/api/admin`)

### `GET /api/admin/overview`
Dashboard KPIs, active queue depth, capacity utilization percentages, and today's roster.

### `GET /api/admin/analytics`
7-day booking trends, crop volume distribution, quality pass rates, and DBT payment liquidity.
