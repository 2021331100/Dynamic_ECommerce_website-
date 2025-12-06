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
