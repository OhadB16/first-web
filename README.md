# ✈️ SKY Jet Store

A full-stack React + Node.js web app for browsing, selecting, and purchasing private jets.  
Includes registration/login, cart & checkout flow, purchase history, reviews, contact desk, FAQ, and an admin panel with product management.  
_Stripe checkout is scaffolded (client libs) and can be wired later._

---

## 🧱 Tech Stack

- **Frontend:** React, CSS (dark/light themes), local state
- **Backend:** Node.js, Express, CORS, cookie sessions, rate limiting
- **Persistence:** File-based JSON (under `server/data/`)
- **Admin:** Add/remove products, view activity, moderate reviews/messages
- **Images:** Base64 uploads from Admin (5MB server payload cap)
- **Testing:** API smoke tests (`server/tests`)

---

## 🚀 Quick Start

> **Requirements:** Node.js 18+ and npm 9+

### 1) Start the API (server)
```bash
cd server
npm install
npm start            # starts http://localhost:3001



Auto-seeds admin: admin / admin
Static docs:
http://localhost:3001/readme.html
http://localhost:3001/llm.html

🧭 App Tour
Store → Cart → Pay: add jets, pay (mock), and see purchases in My Items.
Reviews: users can post reviews (instant); Admin can delete reviews.
Contact: users can submit a message; Admin sees an inbox and can delete/handle.
FAQ / About: static info pages.
Theme Toggle: fixed at top-left (light/dark).
Menu (☰): navigate pages; links to /readme.html and /llm.html.
Admin login: admin / admin (reveals Admin-only menu items and actions).

👤 Roles & Permissions
User
Register/login, add to cart, purchase, view My Items
Submit contact messages, post reviews
Admin
Add/remove products
View activity (admin endpoints)
Moderate: delete reviews and contact messages
Server enforcement: Admin endpoints require X-Username: admin (and cookies).
UI gating: Admin controls are hidden for non-admin users.

🌐 API Summary (server @ http://localhost:3001)
Auth & session
POST /api/register – create user (forbids “admin” username)
POST /api/login – login; sets cookies (skyUser, username)
POST /api/logout – clears cookies
GET /api/me – returns current user (from cookies/headers/query)
Products
GET /api/products – list of jets (base + admin additions, minus hidden)
POST /api/products – Admin add product
DELETE /api/products/:id – Admin delete (admin products) or hide (base)
Cart & Purchase
POST /api/cart/:username – replace full cart for user
GET /api/cart/:username – get user cart
DELETE /api/cart/:username/:jetId – remove one item from cart
POST /api/purchase/:username – record a purchase + clear cart
GET /api/purchase/:username – get all purchases for user
Reviews
GET /api/reviews?source=ask-the-aspects – list reviews
POST /api/reviews – create review
DELETE /api/reviews/:id – Admin delete
Contact (messages)
GET /api/contact – Admin inbox
POST /api/contact – submit a message
DELETE /api/contact/:id – Admin delete
Activity (admin)
GET /api/admin/activity – Admin activity log
GET /api/admin/activity/sales?bucket=day|week|month|year – Admin sales aggregates
Notes
CORS allows http://localhost:3000 with credentials.
Request payload limit: 5MB (413 on overflow).
Persistence in server/data/*.json (auto-created).

🧪 Testing
From the server folder:
npm run test:api                 # runs server/tests/test.js
node --test server/tests/e2e.test.js

SKY-Store/
├─ client/
│  ├─ package.json
│  ├─ public/
│  └─ src/                      # pages, components, assets (jets images), theme files
├─ server/
│  ├─ server.js
│  ├─ routes/                   # login, register, products, cart, purchase, me, logout, reviews, contact, activity
│  ├─ helpers/                  # persist_module.js
│  ├─ data/                     # *.json (created/updated at runtime)
│  ├─ public/                   # readme.html, llm.html
│  └─ tests/                    # test.js, e2e.test.js
└─ README.md

