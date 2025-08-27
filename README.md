# ✈️ SKY Jet Store — Docs Bundle


## 1) README.md (Quick)

A minimal guide focused on **how to run** the app locally and **what to install**.  
(Full documentation lives in `server/public/readme.html` and `server/public/llm.html`.)

### TL;DR

```bash
# Terminal 1 — Server
cd server
npm install
npm start           # or: node server.js

# Terminal 2 — Client
cd client
npm install
npm start

# Open the app
# http://localhost:3000
# Admin login:  username: admin   password: admin
```

### Requirements
- Node.js 18+
- npm
- Ports 3000 (client) and 3001 (server) available

### What gets installed
- **Server**: express, cors, cookie-parser, express-rate-limit, fs-extra  
- **Client**: React + CSS, and:
  - recharts (admin charts)
  - @stripe/react-stripe-js, @stripe/stripe-js (future checkout; not required right now)

If needed:
```bash
# server
cd server
npm i express cors cookie-parser express-rate-limit fs-extra

# client
cd ../client
npm i
npm i recharts @stripe/react-stripe-js @stripe/stripe-js
```

### Running locally
1. Start server (`npm start` inside `server`) → http://localhost:3001  
   Static docs:
   - /readme.html
   - /llm.html
2. Start client (`npm start` inside `client`) → http://localhost:3000

> If you change the client origin/port, update CORS in `server/server.js`.

### Using the app
- Register/login (supports “Remember me”)
- Browse jets, search, add to cart → Pay (simulated) → My Items
- Reviews: users post; admin can delete
- Contact: users send; admin inbox can delete
- FAQ / About via menu
- Theme toggle (top-left)

**Admin** (`admin`/`admin`): admin page, review moderation, contact inbox delete, product management.

### Persistence
JSON under `server/data/*.json` (create missing ones as `[]`):
- users.json, carts.json, purchases.json, activity.json
- jets.json, products.json, messages.json, reviews.json (if used)
Server ensures an **admin** user exists.

### Images
Expected at `client/src/assets/jets/`:
```
Falcon.png
SkyLiner200.png
AeroSwift.png
CloudCruiser.png
JetStream500.png
EagleEye.png
SkyDancer.png
Nimbus300.png
Horizon700.png
PhoeniGT.png
```

### Optional tests
- `server/test.js` → `npm run test:api`
- `server/tests/e2e.test.js` (Node’s `node:test`)

### Troubleshooting
- Port in use → change or stop the other proc
- CORS error → ensure client at :3000 (or update CORS)
- Missing JSON → create `[]`
- Broken images → verify exact filenames

---

