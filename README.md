# NearZro

**A full-stack event management SaaS platform for booking venues, vendors, and managing events.**

---

## 📋 Overview

NearZro is a comprehensive event management marketplace that connects customers with venues and vendors for weddings, corporate events, and parties. The platform supports three primary user roles — **Customers**, **Vendors**, and **Venue Owners** — with a full-featured admin dashboard for oversight.

Key capabilities include:

- Multi-role registration and profile management
- Venue and vendor discovery with advanced search/filtering
- Shopping cart with itemized booking (venue + services)
- Real-time availability checking and booking
- Razorpay-powered payments with webhook-driven reconciliation
- AI-powered event planning assistant
- Automated notifications (email, SMS, WhatsApp, in-app)
- KYC verification workflow
- Payout management and financial reporting
- Comprehensive admin controls for approvals, analytics, and audits

---

## 🏗️ Tech Stack

### Frontend (`nearzro-frontend/`)

| Stack | Version | Purpose |
|-------|---------|---------|
| Next.js | 15.1.6 | React framework with SSR |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| Radix UI | latest | Accessible component primitives |
| Framer Motion | 12.34.3 | Animations |
| Socket.io Client | ~4.8.3 | Real-time updates |
| Recharts | 3.7.0 | Data visualization |
| Axios | 1.13.5 | HTTP client |
| Playwright | 1.58.2 | E2E testing |

### Backend (`nearzro-backend/`)

| Stack | Version | Purpose |
|-------|---------|---------|
| NestJS | 11.x | Node.js framework |
| TypeScript | 5.4.5 | Type safety |
| Prisma | 6.10.1 | ORM |
| PostgreSQL | 15 | Primary database |
| Redis | 7-alpine | Caching & job queues |
| BullMQ | 4.16.5 | Background job processing |
| Passport + JWT | ~11.x | Authentication |
| Razorpay SDK | 2.9.6 | Payment gateway |
| AWS SDK (S3) | ~3.1000.0 | File uploads |
| Nodemailer | 8.0.3 | Email delivery |
| Twilio | 5.13.1 | SMS/WhatsApp |
| OpenAI SDK | 6.16.0 | AI event planner |
| Swagger/OpenAPI | 7.x | API documentation (dev) |
| Jest | 30.2.0 | Unit/E2E testing |

---

## 📁 Monorepo Structure

```
Nearzro/
├── nearzro-backend/            # NestJS API server
│   ├── src/
│   │   ├── app.module.ts           # Root module with all imports
│   │   ├── main.ts                 # Server bootstrap & middleware
│   │   ├── auth/                   # Authentication & authorization
│   │   ├── users/                  # User management
│   │   ├── venues/                 # Venue CRUD + availability
│   │   │   ├── availability/
│   │   │   └── booking/
│   │   ├── vendors/                # Vendor CRUD + services
│   │   ├── events/                 # Event lifecycle management
│   │   ├── cart/                   # Shopping cart with locking
│   │   ├── payments/               # Razorpay integration + webhooks
│   │   ├── express/                # Express booking service
│   │   ├── ai-planner/             # OpenAI-powered planning
│   │   ├── ai-chatbot/             # Conversational AI assistant
│   │   ├── notifications/          # Multi-channel notifications
│   │   ├── kyc/                    # KYC verification
│   │   ├── payouts/                # Vendor/venue payouts
│   │   ├── promotions/             # Discount codes
│   │   ├── reviews/                # Ratings & reviews
│   │   ├── analytics/              # Business analytics
│   │   ├── approvals/              # Admin approval workflow
│   │   ├── reports/                # Admin reports
│   │   ├── audit/                  # Audit logging
│   │   ├── business-rules/         # Pricing & cart calculations
│   │   ├── config/                 # App configuration service
│   │   ├── health/                 # Health check endpoint
│   │   ├── dashboard/              # Dashboard aggregates
│   │   ├── search/                 # Search & filtering
│   │   ├── contact/                # Contact form handling
│   │   ├── prisma/                 # Prisma client + seed
│   │   ├── storage/                # S3 & DB file storage
│   │   ├── common/                 # Guards, filters, interceptors
│   │   └── test/                   # Jest configs
│   ├── prisma/
│   │   ├── schema.prisma           # Full data model (1184 lines)
│   │   └── seed.ts                 # Database seeding
│   ├── uploads/                    # Local file storage (mounted)
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md                   # Generic NestJS boilerplate
├── nearzro-frontend/            # Next.js 15 app
│   ├── src/
│   │   ├── app/                    # App Router (React Server Components)
│   │   │   ├── (public)/           # Public routes (no auth)
│   │   │   │   ├── page.tsx        # Landing page
│   │   │   │   ├── login/
│   │   │   │   ├── register/       # Customer, Vendor, Venue Owner
│   │   │   │   ├── vendors/[id]/   # Vendor profile + booking
│   │   │   │   ├── cart/
│   │   │   │   ├── checkout/
│   │   │   │   ├── plan-event/     # AI planner entry
│   │   │   │   ├── plans/share/[shareId]/
│   │   │   │   └── terms, privacy, about, contact
│   │   │   ├── (dashboard)/        # Protected routes (requires auth)
│   │   │   │   ├── dashboard/      # Dashboard shell
│   │   │   │   ├── customer/       # Customer-specific pages
│   │   │   │   ├── venue/          # Venue owner pages
│   │   │   │   ├── vendor/         # Vendor pages
│   │   │   │   └── admin/          # Admin-only pages
│   │   │   ├── layout.tsx          # Public layout (header/footer)
│   │   │   └── (dashboard)/layout.tsx  # Dashboard layout (sidebar)
│   │   ├── components/             # Reusable UI
│   │   │   ├── ui/                 # shadcn/ui style primitives
│   │   │   ├── layout/             # Header, footer, sidebar
│   │   │   ├── home/               # Landing page sections
│   │   │   └── ...                 # Feature-specific components
│   │   ├── context/                # React context (auth, theme)
│   │   ├── hooks/                  # Custom hooks
│   │   ├── lib/                    # Utilities (axios instance, etc.)
│   │   ├── services/               # API client services
│   │   ├── types/                  # TypeScript definitions
│   │   └── tests/                  # Playwright specs
│   ├── public/                     # Static assets
│   ├── .env.example
│   ├── Dockerfile
│   ├── next.config.ts              # SSR proxy to backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── eslint.config.mjs
│   └── playwright.config.ts
├── docker-compose.yml              # Local dev stack (all services)
├── docker-compose.prod.yml         # Production overrides
├── .env.example                    # Root env template
└── AGENTS.md                       # Kilo CLI agent definitions
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ LTS
- **PNPM** or **npm** (npm used in scripts)
- **Docker** + **Docker Compose** (recommended for full stack)
- **PostgreSQL** 15 (if running locally without Docker)
- **Redis** 7 (if running locally without Docker)

### Option 1: Docker Compose (Recommended)

The fastest way to run the full application locally:

```bash
# 1. Clone and navigate to project root
cd Nearzro

# 2. Set required environment variables
# Create a .env file in the project root based on .env.example
cp .env.example .env
# Edit .env and add:
# - POSTGRES_PASSWORD (default: 2006)
# - JWT_SECRET (generate a strong secret)
# - RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (test keys recommended)
# - AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_BUCKET (optional)

# 3. Start all services
docker-compose up -d

# 4. Run database migrations (if not auto-executed)
docker exec nearzro-backend npx prisma migrate deploy

# 5. Seed database (optional)
docker exec nearzro-backend npm run prisma:seed
```

Services will be available at:

- **Frontend**: <http://localhost:3001>
- **Backend API**: <http://localhost:3000>
- **Swagger Docs** (dev only): <http://localhost:3000/api/docs>
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Option 2: Local Development (without Docker)

#### Backend

```bash
cd nearzro-backend

# 1. Install dependencies
npm install

# 2. Set up .env file (copy from example or create manually)
cat > .env << EOF
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/nearzro"
JWT_SECRET="your-super-secret-jwt-key-change-this"
REDIS_HOST="localhost"
REDIS_PORT=6379
OPENAI_API_KEY="sk-..."
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="..."
EMAIL_* (optional - Gmail SMTP)
FRONTEND_URL="http://localhost:3001"
NODE_ENV="development"
EOF

# 3. Start PostgreSQL & Redis locally (via Docker or native)

# 4. Generate Prisma client & run migrations
npx prisma generate
npm run prisma:migrate

# 5. Seed database (optional)
npm run prisma:seed

# 6. Start development server (watch mode)
npm run start:dev
# Backend runs at http://localhost:3000
```

#### Frontend

```bash
cd nearzro-frontend

# 1. Install dependencies
npm install

# 2. Set up .env
cp .env.example .env.local
# .env.local will be used by Next.js automatically

# Ensure NEXT_PUBLIC_API_URL points to your backend
# NEXT_PUBLIC_API_URL=http://localhost:3000
# API_INTERNAL_URL=http://nearzro-api:3000 (for Docker SSR)

# 3. Start development server
npm run dev
# Frontend runs at http://localhost:3001
```

### Build & Run Production Locally

```bash
# Backend
cd nearzro-backend
npm run build
npm run start:prod

# Frontend
cd nearzro-frontend
npm run build
npm run start
```

---

## 🔧 Environment Variables

### Backend (`nearzro-backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens (min 32 chars) |
| `REDIS_HOST` | No | Redis host (default: `redis` or `127.0.0.1`) |
| `REDIS_PORT` | No | Redis port (default: `6379`) |
| `OPENAI_API_KEY` | No | OpenAI API key for AI planner features |
| `OPENAI_MODEL` | No | Model to use (default: `gpt-4o-mini`) |
| `RAZORPAY_KEY_ID` | Yes* | Razorpay key ID (test/live) |
| `RAZORPAY_KEY_SECRET` | Yes* | Razorpay secret key |
| `AWS_ACCESS_KEY_ID` | No | AWS credentials for S3 uploads |
| `AWS_SECRET_ACCESS_KEY` | No | AWS secret key |
| `AWS_S3_BUCKET` | No | S3 bucket name (if set, uploads go to S3) |
| `AWS_REGION` | No | AWS region (default: `ap-south-1`) |
| `GMAIL_USER` | No | Gmail address for outgoing emails |
| `GMAIL_APP_PASSWORD` | No | Gmail App Password (16-char) |
| `EMAIL_FROM` | No | Sender email address |
| `FRONTEND_URL` | Yes | Frontend origin for CORS (dev: `http://localhost:3001`) |
| `NODE_ENV` | No | `development` \| `production` (default: `development`) |
| `USE_REDIS` | No | Enable Redis cache (`true`/`false`, default: `true`) |

*Required for production. In development mock mode is used if keys are missing.

### Frontend (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Public API base URL (e.g., `http://localhost:3000`) |
| `API_INTERNAL_URL` | Yes* | Internal API URL for SSR (Docker network name) |
| `NEXT_TELEMETRY_DISABLED` | No | Disable Next.js telemetry (`1` to disable) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes* | Razorpay public key for client checkout |

*Required for production / Docker deployment.

---

## 📜 Available Scripts

### Backend

```bash
# Development
npm run start            # Start production-like server
npm run start:dev        # Start with hot-reload (Nest CLI watch)
npm run start:prod       # Start compiled dist/ output

# Build & Lint
npm run build            # Compile TypeScript to dist/
npm run lint             # Run ESLint
npm run lint:fix         # Fix lint errors automatically

# Database (Prisma)
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations locally (dev)
npm run prisma:seed      # Seed database with sample data
npx prisma studio        # Open Prisma Studio at http://localhost:5555

# Testing
npm run test             # Run all tests (Jest)
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:unit        # Unit tests only
npm run test:e2e         # E2E tests only
npm run test:db:create   # Create test database
npm run test:db:migrate  # Apply migrations to test DB
npm run test:db:reset    # Reset test database
```

### Frontend

```bash
# Development
npm run dev              # Start dev server at http://localhost:3001
npm run build            # Build for production (standalone output)
npm run start            # Start production server

# Linting & Type Checking
npm run lint             # Run ESLint

# Testing (Playwright)
npm run test             # Run all tests headless
npm run test:ui          # Open interactive UI test runner
npm run test:headed      # Run tests in headed (visible) mode
npm run test:report      # Open HTML test report
npm run test:debug       # Run with debugger attached
npm run test:codegen     # Generate Playwright test code
```

---

## 🗄️ Database Schema

The data model is defined in [`nearzro-backend/prisma/schema.prisma`](nearzro-backend/prisma/schema.prisma) and includes:

### Core Entities

- **User** — Base account with role-based access (`CUSTOMER`, `VENDOR`, `VENUE_OWNER`, `ADMIN`, `EVENT_MANAGER`, `SUPPORT`)
- **CustomerProfile** — Optional extended profile for customers (preferred city, notes)
- **Vendor** — Business profile with verification status, KYC, portfolio images
- **Venue** — Event space with capacity, pricing, amenities, photos, KYC, trade license
- **VendorService** — Offerings by vendors (catering, photography, decor, etc.)
- **VenuePhoto** / **PortfolioImage** — Advanced photo management with categorization, ordering, tags
- **AvailabilitySlot** — Time slots available for booking (polymorphic: venue or vendor)
- **Booking** — Guest-facing reservation for a specific slot

### Transactional & Business Logic

- **Cart** — Holds items before payment; supports express fee and expiry
- **CartItem** — Individual line items (venue, vendor service, add-ons); unique constraint prevents double-add
- **Event** — Confirmed booking with pricing breakdown (subtotal, platform fee, tax, total)
- **EventService** — Nested services for an event (e.g., additional decor add-ons)
- **Payment** — Razorpay order with full audit trail (PaymentEvent)
- **PaymentEvent** — Immutable audit log of all payment state changes
- **Payout** — Payout request to vendor/venue with approval workflow
- **Promotion** — Discount codes with usage limits and validity periods
- **Review** / **ReviewVote** — Ratings with helpfulness voting

### Security & Compliance

- **RefreshToken** — Rotating refresh tokens with expiry and revocation
- **OtpRecord** — OTP storage for verification/forgot password flows
- **KycDocument** — KYC document upload with hashing for deduplication
- **BankAccount** — Bank details for payouts (hashed account number)
- **AuditLog** — Immutable audit trail for sensitive actions
- **AuditOutbox** — Outbox pattern for eventual consistency (audit events)

### AI & Notifications

- **AIPlan** — Generated event plans with JSON payload and sharing
- **AIConversation** — Stateful chatbot session for planning
- **Notification** / **NotificationDelivery** / **NotificationPreference** — Multi-channel notification system

### System & Settings

- **Settings** — Feature flags, integration keys, security settings
- **PlatformSettings** — Platform-wide percentages (fees, taxes, commissions)
- **OutboxEvent** — General outbox for domain events (Cart, System)

All models include `createdAt`, `updatedAt`, and appropriate indexes for query performance.

---

## 🌐 API Structure

The backend exposes RESTful APIs under the `/api` prefix with URI versioning (`/api/v1/...`).

### Base URL

- Development: `http://localhost:3000/api/v1`
- Production: `https://yourdomain.com/api/v1`

### Authentication

- **Local**: Email + password (bcrypt)
- **OAuth**: Google, Facebook (Passport.js)
- **Token Flow**: Access token (15 min) + Refresh token (7 days)
- **Protected Routes**: Use `Authorization: Bearer <access_token>`
- **Role-Based Guards**: `@Roles(...)` + `RolesGuard`

### Major Endpoints (from Swagger tags)

| Tag | Purpose |
|-----|---------|
| `Authentication` | Register, login, OTP verify, forgot/reset password, refresh token |
| `Users` | Profile CRUD, email/phone existence checks |
| `Venues` | Venue CRUD, KYC upload, availability, photos, details |
| `Vendors` | Vendor CRUD, services, portfolio, KYC |
| `Events` | Create, update, status transitions, event details |
| `Cart` | Add/remove items, lock/release, cart summary |
| `Payments` | Create order, confirm payment, webhook, refunds, status |
| `AI Planner` | Generate plans, save, share plans |
| `AI Chatbot` | Conversational stateful assistant |
| `Notifications` | List, mark read, preference management |
| `Kyc` | Document upload, verification status |
| `Payouts` | Request, approve/reject, history |
| `Promotions` | Create/edit discount codes |
| `Reviews` | Submit, vote, moderate |
| `Analytics` | Dashboard metrics (revenue, bookings, etc.) |
| `Approvals` | Admin approve/reject venues, vendors, KYC |
| `Reports` | Revenue, users, venues, vendors reports |
| `Audit` | Audit log viewer |
| `Settings` | Platform fee, feature flags |
| `Search` | Full-text and filtered search |

### API Examples

**Create a cart item** (add venue to cart)

```http
POST /api/v1/cart/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "itemType": "VENUE",
  "venueId": 12,
  "date": "2026-06-15T00:00:00.000Z",
  "timeSlot": "MORNING",
  "quantity": 1
}
```

**Create payment order**

```http
POST /api/v1/payments/order
Authorization: Bearer <token>

{
  "cartId": 5,
  "idempotencyKey": "order_cart5_20250613"
}
```

**Confirm payment** (client callback)

```http
POST /api/v1/payments/confirm
Authorization: Bearer <token>

{
  "razorpayOrderId": "order_...",
  "razorpayPaymentId": "pay_...",
  "razorpaySignature": "..."
}
```

**Razorpay webhook** (server-to-server)

```http
POST /api/v1/payments/webhook
Content-Type: application/json

{
  "event": "payment.captured",
  "payload": { ... }
}
```

**Generate AI plan**

```http
POST /api/v1/ai-planner/generate
Authorization: Bearer <token>

{
  "city": "Chennai",
  "area": "T. Nagar",
  "guestCount": 500,
  "budget": 100000000,
  "eventType": "wedding"
}
```

---

## 🎨 Frontend Architecture

- **App Router** (`src/app/`) — Next.js 15 with React Server Components (RSC)
- **Route Groups** — `(public)` and `(dashboard)` for layout separation
- **Server Actions** — Form submissions use server actions where applicable
- **Client Components** — Interactive UI with `"use client"` directive
- **Styling** — Tailwind CSS 4 with custom configuration
- **UI Library** — Radix UI primitives + shadcn-inspired custom components
- **State Management** — React Context (auth, theme) + local component state
- **Data Fetching** — Custom service layer using Axios + SWR pattern
- **Real-time** — Socket.io client for notifications

### Key Pages (Public)

- `/` — Landing page with hero, categories, featured venues, CTA
- `/login` — Email/password + OAuth buttons (Google, Facebook)
- `/register/customer` — Customer signup form
- `/register/vendor` — Vendor registration with KYC docs
- `/register/venue-owner` — Venue owner registration
- `/vendors` — Vendor directory with filters
- `/vendors/[id]` — Vendor profile + booking button
- `/cart` — Cart review and checkout
- `/plan-event` — AI planner wizard entry point
- `/plans/share/[shareId]` — Public shared AI plan view
- `/terms`, `/privacy`, `/about`, `/contact` — Static pages

### Key Pages (Dashboard)

- `/dashboard` — Home with metrics and quick actions
- `/dashboard/customer/` — Customer bookings, events, plans, profile, KYC, notifications
- `/dashboard/venue/` — Venue analytics, bookings, earnings, payouts, reviews, profile, KYC
- `/dashboard/vendor/` — Vendor services, bookings, earnings, reviews, portfolio, profile, KYC
- `/dashboard/admin/` — Admin approvals (venues, vendors, KYC), events, users, transactions, reports, payouts, promotions, audit logs, system settings

---

## 🔐 Security Features

### Backend

- Helmet.js HTTP security headers with CSP
- CORS with strict origin allowlist
- Rate limiting (Nest Throttler) — 100 req/min burst, 30 sustained
- Request body size limits (200KB JSON, 50KB for specific endpoints)
- Global validation pipe (class-validator + class-transformer)
- JWT with Redis blacklist support (token revocation)
- Refresh token rotation + device tracking
- Bcrypt password hashing (12 rounds)
- OTP-based email verification and password reset
- Row-level locking (SELECT ... FOR UPDATE) for payments/booking
- Idempotency keys for payment creation
- Webhook signature verification (Razorpay HMAC)
- Audit logging with outbox pattern
- SQL injection prevention via Prisma parameterized queries
- Input sanitization (DOMPurify, sanitize-html where applicable)

### Frontend

- CSP headers respected via Next.js config
- CSRF protection via SameSite cookies (when implemented)
- XSS prevention with React auto-escaping
- Form validation (Zod + client-side)
- Secure token storage (HTTP-only cookies or secure context)

---

## 🏢 Business Logic Summary

### Booking Flow

1. Venue/Vendor publishes availability slots
2. Customer adds items to cart (venue + services)
3. Cart is **locked** when payment order is created
4. Payment is processed via Razorpay
5. On successful capture (webhook), cart status → COMPLETED and **Events** are created
6. Notifications dispatched to customer, vendor/venue
7. Payouts are scheduled (based on policy) and released after event completion

### Express Booking (Premium Fast-Track)

- Customers can skip cart selection
- Uses simplified `createOrderSimple` endpoint
- Express fee applied (configurable platform fee)
- Event created directly after payment confirmation

### AI Planner

- Customer describes requirements → OpenAI generates a structured plan (JSON)
- Plan includes venue suggestions, vendor services, timeline, estimated budget breakdown
- Plans can be saved, shared (public link), or converted to cart with one click
- Uses `AIPlan` + `AIConversation` models to persist chat history

### Payout Workflow

- After event completion, admin reviews payout eligibility
- Payout created for vendor/venue with amount calculated (after platform fees)
- Admin approves → status `PROCESSING` → bank transfer (external)
- Rejection requires reason (stored in `rejectionReason` field)

### KYC Verification

- Document upload (Aadhaar, PAN, Passport, Driving License)
- Documents stored in S3 or DB (hybrid based on env)
- Admin reviews and approves/rejects
- Hash-based deduplication prevents duplicate document reuse
- Cannot activate listings without verified KYC

### Notifications

- Multi-channel: In-app, Email, SMS (Twilio), WhatsApp (Twilio), Push (future)
- Event types: booking confirmed/cancelled, payment success/failed, KYC approved/rejected, review received, event reminder
- Per-user preferences in `NotificationPreference`
- Background job queue (BullMQ) for reliable delivery with retry/backoff

---

## 🏗️ Deployment

### Production Checklist

1. Set all required environment variables
   - `NODE_ENV=production`
   - `DATABASE_URL` (managed PostgreSQL, e.g., Supabase, Neon, RDS)
   - `JWT_SECRET` (strong random 64+ chars)
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (live keys)
   - `AWS_*` for S3 file storage
   - `GMAIL_*` for email (or configure SMTP relay)
   - `TWILIO_*` for SMS/WhatsApp if enabled
   - `FRONTEND_URL` = your public frontend URL

2. Update `docker-compose.prod.yml` with:
   - Resource limits
   - Volume mounts for persistent uploads
   - Secrets management (instead of plaintext env)

3. Build and push images or use CI/CD pipeline

4. Run migrations on the production database:

   ```bash
   npx prisma migrate deploy
   ```

5. Seed only if needed (usually skip in prod):

   ```bash
   npx prisma db seed
   ```

6. Configure reverse proxy (Nginx/Traefik) for:
   - SSL termination (HTTPS)
   - Static asset caching
   - Rate limiting at edge
   - Health check endpoints (`/api/v1/health`)

7. Enable monitoring:
   - Application logs → ELK/Datadog/Papertrail
   - Database metrics (PgHero, pg_stat_statements)
   - Redis monitoring
   - Uptime monitoring (Sentry, Pingdom)

### Docker Commands

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f nearzro-backend
docker-compose logs -f nearzro-frontend

# Restart a service
docker-compose restart nearzro-api

# Stop all
docker-compose down

# Stop and remove volumes (CAUTION: deletes DB data)
docker-compose down -v
```

---

## 🧪 Testing

### Backend (Jest)

```bash
cd nearzro-backend

# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# All tests
npm run test:all

# With coverage
npm run test:cov
```

Test files co-located with `*.spec.ts` or in `test/` directory.

### Frontend (Playwright)

```bash
cd nearzro-frontend

# Install browsers (first time only)
npx playwright install

# Run all tests (Chromium, Firefox, WebKit)
npm run test

# Run specific browser
npx playwright test --project=chromium

# Run with UI for debugging
npm run test:ui

# Generate test from recorded session
npm run test:codegen http://localhost:3001

# View HTML report
npm run test:report
```

Tests located in `tests/` directory with spec files `*.spec.ts`.

---

## 📊 Monitoring & Health

- **Health endpoint** — `GET /api/v1/health` (returns 200 if DB & Redis reachable)
- **Swagger docs** — `http://localhost:3000/api/docs` (dev only)
- **Prisma Studio** — `http://localhost:5555` (local dev)
- **Redis Commander** (optional) — `http://localhost:8081`

Logs use NestJS built-in logger with context. Production should pipe logs to stdout for Docker/Docker Compose collection.

---

## 🔄 Continuous Integration

No CI is configured yet. Recommended setup:

- **GitHub Actions** for:
  - Lint (`npm run lint`)
  - Type-check (`npx tsc --noEmit`)
  - Unit tests (`npm run test:unit` / `npm run test:ci`)
  - Build verification (`npm run build` for both packages)
  - E2E tests (with Playwright + Docker services)

---

## 🤝 Contributing

This is a private codebase. If you are a collaborator:

1. **Branch naming** — `feature/feature-name`, `fix/bug-description`, `refactor/...`
2. **Commit messages** — Use Conventional Commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
3. **PR checklist**
   - [ ] Lint passes (`npm run lint`)
   - [ ] TypeScript compiles without errors
   - [ ] Tests added/updated and passing
   - [ ] Database migrations included (if schema changed)
   - [ ] Backend API tested with Swagger or Postman
   - [ ] Frontend UI tested manually
   - [ ] No secrets committed (use `.env` and `.gitignore`)
4. **Code review** — Required from at least one team member

---

## 📄 License

No license file found in the repository. This project is proprietary and not open source. See project owners for usage rights.

---

## 🆘 Support & Contact

- **Project Maintainer** — See repository owners/team
- **Documentation** — Internal wiki (if available)
- **Issues** — GitHub Issues (if repository is public)
- **Live Chat** — In-app support widget (if implemented)

---

*Generated from actual source code analysis on 2026-05-13.*
