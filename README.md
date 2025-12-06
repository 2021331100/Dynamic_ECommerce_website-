# Dynamic E-Commerce (Client + Dashboard + Server)

Full-stack commerce app with: customer storefront (Vite/React/Tailwind), admin dashboard (Vite/React/Recharts), and Node/Express/PostgreSQL API. Stripe handles payments; Cloudinary handles media; Nodemailer for emails.

## Contents
- Project layout
- Prerequisites
- Environment variables (server + client + dashboard)
- Install & run (dev)
- Build commands
- Key features
- API surface (high level)
- Payments (Stripe)
- Database schema notes
- Deployment notes
- Security & secrets
- Troubleshooting

## Project Layout
- `client/` — storefront app (React 19, Vite, Tailwind, Redux Toolkit)
- `dashboard/` — admin UI (React 19, Vite, Recharts, Redux Toolkit)
- `server/` — Express API, PostgreSQL, Stripe, Cloudinary, Nodemailer
- `server/uploads/` — temp uploads (gitignored)
- `.gitignore` — ignores envs, uploads, build artifacts

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ (tested with 18)
- Stripe account + API keys
- Cloudinary account (cloud name, key, secret)
- SMTP app password (Gmail or provider of choice)

## Environment Variables
Create `server/config/config.env` (never commit). Example:
```
PORT=4000
FRONTEND_URL=http://localhost:5173
DASHBOARD_URL=http://localhost:5174

# JWT / Auth
JWT_SECRET_KEY=change_me
JWT_EXPIRES_IN=30d
COOKIE_EXPIRES_IN=30

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_NAME=mern_ecommerce_store

# Stripe
STRIPE_SECRET_KEY=sk_live_or_test
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_FRONTEND_KEY=pk_live_or_test

# Currency conversion (if catalog prices are BDT)
BDT_TO_USD=0.0091

# Email (SMTP)
SMTP_SERVICE=gmail
SMTP_MAIL=you@example.com
SMTP_PASSWORD=app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465

# Cloudinary
CLOUDINARY_CLIENT_NAME=xxxx
CLOUDINARY_CLIENT_API=xxxx
CLOUDINARY_CLIENT_SECRET=xxxx
```

Client and dashboard `.env` (Vite style):
```
VITE_API_URL=http://localhost:4000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_or_test
```

## Install & Run (dev)
### Server (Express + Postgres)
```
cd server
npm install
npm run dev
```
- Runs on `PORT` (default 4000).
- `createTables()` seeds schema on start.
- Stripe webhook: `/api/v1/payment/webhook` (raw body enabled in `app.js`).

### Client (storefront)
```
cd client
npm install
npm run dev
```
Visit `http://localhost:5173`.

### Dashboard (admin)
```
cd dashboard
npm install
npm run dev
```
Visit `http://localhost:5174`.

## Build
- Client: `cd client && npm run build` → `dist/`
- Dashboard: `cd dashboard && npm run build`
- Server: `npm start` (no bundling; ensure env vars set)

## Key Features
- Products: list, view, filter (category, price range, rating, availability), AI search, pagination (12/page)
- Cart/Orders: place orders, shipping info capture, tax/shipping calculation
- Payments: Stripe PaymentIntent, webhook updates order/payment status, stock decrement on success
- Media: Cloudinary upload support
- Auth: JWT-based auth with cookies
- Admin: product CRUD, order view, dashboard charts (sales, low stock), modals for create/update/view

## API Surface (high level)
- Auth: `/api/v1/auth` (login/register/profile etc.)
- Products: `/api/v1/product` (list with filters: category, price `min-max`, search, ratings, availability, page)
- Orders: `/api/v1/order` (place order, my orders, webhook updates)
- Admin: `/api/v1/admin` (product and order management)
- Payments: `/api/v1/payment/webhook` (Stripe webhook; uses `stripe-signature` header)

## Payments (Stripe)
- Amount is sent in the configured currency inside `generatePaymentIntent`.
- If catalog prices are BDT, convert before calling Stripe (e.g., `amountInUsdCents = totalPrice * BDT_TO_USD * 100`, `currency: "usd"`).
- Set webhook endpoint in Stripe Dashboard to `<your-api-host>/api/v1/payment/webhook` using `STRIPE_WEBHOOK_SECRET`.

## Database Notes
- `price` is `DECIMAL(10,2)` (max ≈ 9,999,999.99).
- Tables auto-create on server start. For manual changes, run SQL via psql/pgAdmin.
- Stock is decremented after successful payment webhook.

## Deployment Notes
- Storefront & dashboard: deploy to Vercel/Netlify; set `VITE_API_URL` to your backend URL and `VITE_STRIPE_PUBLISHABLE_KEY`.
- Backend: use a long-running Node host (Render/Railway/Fly/AWS). If moving to Vercel serverless, remove `app.listen` and export the Express handler; adjust routes under `/api`.
- Set env vars in your hosting provider; never commit `.env`.

## Security & Secrets
- `.env` files are gitignored. Keep secrets out of commits.
- Rotate Stripe, Cloudinary, SMTP, JWT secrets if exposed.
- Use strong JWT secret and unique SMTP app password.

## Troubleshooting
- Price overflow: ensure DB column is `DECIMAL(10,2)` and run `ALTER TABLE products ALTER COLUMN price TYPE DECIMAL(10,2);` in DB.
- Stripe high-amount failures: convert BDT totals to the Stripe currency before creating PaymentIntent.
- CORS: confirm `FRONTEND_URL` and `DASHBOARD_URL` match the running origins; both are allowed in `app.js`.
- Webhook 400: ensure raw body is preserved and `STRIPE_WEBHOOK_SECRET` matches; check the `stripe-signature` header.
