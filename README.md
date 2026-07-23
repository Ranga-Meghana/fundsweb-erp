# Fundsweb ERP — Mini ERP + CRM Operations Portal

Full-stack ERP/CRM system built for a wholesale/distribution business, submitted as a case study for Fundsweb (Funds Room Infotech LTD).

## Live Demo
- Frontend: https://fundsweb-erp-frontend.vercel.app
- Backend API: https://fundsweb-erp-backend.onrender.com
- Swagger docs: https://fundsweb-erp-backend.onrender.com/api-docs

Note: backend is on Render's free tier, so the first request after a period of inactivity can take 30-50 seconds to wake up.

## Test Logins
Password for every role: `Password@123`

- admin@fundsweb.test
- sales@fundsweb.test
- warehouse@fundsweb.test
- accounts@fundsweb.test

## What's in here
- **Auth** — JWT login, 4 roles (Admin, Sales, Warehouse, Accounts), route-level permission checks
- **Customers** — add/edit/search, lead/active/inactive status, follow-up notes
- **Products & Inventory** — stock levels, low-stock alerts, IN/OUT movement log
- **Sales Challans** — draft → confirm → cancel flow. Confirming a challan deducts stock and logs the movement inside a single database transaction, so it can't half-apply. Stock can't go negative — over-selling returns a proper error instead. Each challan item stores a snapshot of the product's name and price at the time of sale, not just a reference, so it stays accurate even if the product's price changes later.

## Tech
Backend: Node, TypeScript, Express, Prisma, PostgreSQL (Neon)
Frontend: React, TypeScript, Vite
Deployed on: Render (backend), Vercel (frontend)

## Running it locally

Backend:
```bash
cd backend
npm install
cp .env.example .env
```
Fill in `.env` with your own DB URL and JWT secret, then:
```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```
Runs on `localhost:4000`, docs at `/api-docs`.

Frontend:
```bash
cd fundsweb-erp-frontend
npm install
echo "VITE_API_URL=http://localhost:4000" > .env
npm run dev
```
Runs on `localhost:5173`.

## Env vars

Backend needs: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CORS_ORIGIN`
Frontend needs: `VITE_API_URL`

## How it's put together
Backend is one route file per resource (auth, customers, products, challans, dashboard), Zod validating every request body, Prisma handling the DB. Confirming a challan uses a `$transaction` to update stock, log the movement, and flip the challan status together, so a crash mid-way can't leave things inconsistent. Role checks happen in Express middleware that reads the role out of the JWT on every protected route.

Frontend is a plain React SPA — one shared `Layout` with sidebar/logout, a small `AuthContext` holding the token in localStorage, and a page per module.

## What's not done
- No automated tests — tested manually through Swagger given the time limit
- Frontend doesn't hide UI based on role yet (backend still blocks it either way)
- No pagination on the frontend tables, though the API supports it
- PDF invoice works but isn't styled beyond a basic layout
