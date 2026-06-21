# Rakhat — Architecture
**Last Updated:** June 2026

---

## What it is

Rakhat is a GST billing SaaS for Indian SMBs. A shop owner signs up, creates their business, and can invite accountants and viewers. Each business is an isolated tenant — no data leaks across businesses.

---

## Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 16, Tailwind v4, shadcn/ui | App Router, server components, edge-ready |
| Server state | TanStack Query v5 | Caching, background refetch, loading/error states for all API data |
| Client state | Zustand | Session + active business — works outside React (needed by ky hooks) |
| HTTP client | ky | Zero-dependency, native fetch, typed hook API with auth interceptors |
| Backend | Express 5, TypeScript ESM | Mature, simple, `nodenext` modules |
| ORM | Prisma 7 | Type-safe, `@prisma/adapter-pg` for Aurora SSL |
| Database | Amazon Aurora PostgreSQL Serverless v2 | Auto-scales to zero, prod-ready |
| Cache / queues | Upstash Redis (TLS) | OTP TTL, reset tokens, rate limiting |
| Deploy — server | Render | Auto-deploy from GitHub, pre-deploy migrations |
| Deploy — client | Vercel | Auto-deploy from GitHub |
| CI (build gate) | Travis CI | Blocks PR merge if TypeScript compile fails |

---

## Repository layout

```
h0aws/
├── client/                   Next.js app
│   ├── app/
│   │   ├── (auth)/           login, signup — centered layout, no sidebar
│   │   ├── dashboard/        protected layout with Sidebar
│   │   ├── onboarding/       protected — create first business
│   │   └── 403/              unauthorized page
│   ├── components/
│   │   └── Sidebar.tsx       role-filtered nav (client component)
│   ├── config/
│   │   └── sidebar.ts        route → allowed roles map
│   ├── lib/
│   │   └── api.ts            ky instance — attaches token + X-Business-Id
│   ├── shared/
│   │   └── types.ts          Role, Membership
│   ├── store/
│   │   └── authStore.ts      session, memberships, activeBusinessId
│   └── proxy.ts              network gate (refreshToken presence check)
│
├── server/                   Express API
│   ├── src/
│   │   ├── auth/             signup, login, refresh, logout, OTP/reset
│   │   ├── business/         createWithOwner, list
│   │   ├── common/
│   │   │   ├── errors.ts     shared handleError()
│   │   │   └── middleware/
│   │   │       ├── authenticate.ts       JWT → req.user
│   │   │       ├── business-context.ts   X-Business-Id → req.context
│   │   │       └── require-role.ts       RBAC guard factory
│   │   ├── lib/
│   │   │   ├── prisma.ts     PrismaClient with Aurora SSL adapter
│   │   │   └── redis.ts      ioredis (Upstash TLS)
│   │   ├── types/
│   │   │   └── express.d.ts  req.user, req.context augmentation
│   │   └── index.ts          app entrypoint
│   ├── prisma/
│   │   └── schema.prisma
│   ├── prisma.config.ts      Prisma 7 config (url moved out of schema)
│   └── render.yaml           Render IaC
│
└── docs/                     architecture, schema, API contracts, design system
```

---

## Multi-tenancy model

```
User          = an identity (can log in)
Business      = a tenant (owns all data)
BusinessMember = which users belong to which tenant, and as what role
```

`BusinessMember` is a proper M:N join with `@@unique([userId, businessId])`. A user can own multiple businesses or be invited into others as ACCOUNTANT or VIEWER.

**The three-step setup for a new user:**

```
1. POST /auth/signup        → creates User, returns empty memberships[]
2. POST /businesses         → createWithOwner() transaction:
                               Business + BusinessMember(OWNER)
                               + Location("Main Shop") + InvoiceSequence
3. → /dashboard             (now has one membership, auto-selected)
```

---

## State management

Two layers, no overlap:

| Layer | Tool | What it owns |
|---|---|---|
| Server state | TanStack Query | All API data — invoices, customers, inventory, etc. Handles caching, background refetch, loading + error states. |
| Client state | Zustand | Session only — `userId`, `email`, `accessToken`, `memberships[]`, `activeBusinessId`. Lives in memory (no persistence needed — `SessionProvider` rehydrates from the httpOnly cookie on every load). |

**How they connect:**

```
ky interceptors (lib/api.ts)
  → beforeRequest: read accessToken + activeBusinessId from Zustand → attach as headers
  → afterResponse: on 401, call /auth/refresh, update Zustand, retry request

TanStack Query
  → useQuery / useMutation call api.get() / api.post() (the ky instance)
  → gets caching, deduplication, background refetch, loading states for free
  → DevTools available in development
```

Usage pattern:
```typescript
// in any page or component
const { data, isLoading } = useQuery({
  queryKey: ['invoices', activeBusinessId],
  queryFn: () => api.get('invoices').json<Invoice[]>(),
})
```

---

## Request lifecycle

```
Browser request
  → proxy.ts                  check refreshToken cookie → redirect /login if absent
  → Next.js page/layout       server component renders

API call (client → server)
  → ky beforeRequest hook     attach Authorization: Bearer <accessToken>
                              attach X-Business-Id: <activeBusinessId>
  → Express authenticate      verify JWT → req.user = { userId, email }
  → Express businessContext   findUnique BusinessMember(userId, businessId)
                              → req.context = { businessId, role }
  → Express requireRole()     check role if route needs it
  → controller → service → Prisma → Aurora
```

---

## Auth model

Access token proves **identity only** — `{ userId, email }`. Business and role are never in the token. They are resolved fresh from the DB on every request via `businessContext` middleware. This means:

- Role changes take effect immediately (no stale JWT window)
- Removing a user from a business 403s their next request instantly
- Business switching requires no re-login — just change `X-Business-Id`

See [auth.md](auth.md) for full token model and endpoint contracts.

---

## RBAC

Three layers, each catching a different failure mode:

| Layer | Where | What it catches |
|---|---|---|
| `proxy.ts` | Next.js network edge | No session at all → `/login` |
| `dashboard/layout.tsx` | Next.js server component | Wrong role for route → `/403` |
| `requireRole()` middleware | Express | Unauthorized API call → 403 |

The Sidebar filters visible nav items client-side using `useActiveRole()` from Zustand — so unauthorized users never even see links they can't use.

See [rbac.md](rbac.md) for full detail.

---

## Database

Amazon Aurora PostgreSQL Serverless v2.

**Key schema decisions:**

- `@@index([businessId])` on every table that is queried by tenant (Location, Customer, InventoryTransaction, Expense, BusinessMember). Postgres does not auto-index FK columns.
- `Product` and `Invoice` don't need a separate businessId index — their composite uniques `(businessId, sku)` / `(businessId, invoiceNumber)` cover it via the leftmost-prefix rule.
- `SaleItem` uses snapshot fields (`nameSnapshot`, `hsnSnapshot`, etc.) — product details are frozen at time of sale, immune to edits or soft-deletes.
- `InvoiceSequence` holds the invoice counter and prefix per business — atomically incremented, numbers never reused even for cancelled invoices.
- `onDelete: Cascade` on `RefreshToken→User` and `BusinessMember→User/Business` — sessions and memberships die with their parent.

**Aurora SSL:** Prisma 7 uses `@prisma/adapter-pg` with `ssl: { rejectUnauthorized: false }` and `sslmode=no-verify` in the connection string.

See [schema.md](schema.md) for the full ERD.

---

## CI / Deploy

```
PR opened
  → Travis CI builds server/ (tsc) + client/ (next build) in parallel
  → both must pass to merge (GitHub branch protection)

Merge to main
  → Render auto-deploys server (pre-deploy: prisma migrate deploy)
  → Vercel auto-deploys client
```

Travis is a **build gate only** — it never deploys. Render and Vercel handle deploys natively via GitHub integration.

Render pre-deploy runs `prisma migrate deploy` at runtime (not build time) so it uses the runtime IP, which is what Aurora's security group allows.

---

## Environment variables

### Server (Render)

| Var | Notes |
|---|---|
| `DATABASE_URL` | Aurora URL — `%23`-encode `#` in password, append `&sslmode=no-verify` |
| `JWT_SECRET` | Long random string |
| `REDIS_URL` | Upstash `rediss://` URL (TLS) |
| `NODE_ENV` | `production` — guards `dotenv/config` from overriding Render's injected vars |

### Client (Vercel)

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | Full Render service URL + `/api/v1` |
| `JWT_SECRET` | Same value as server — used by dashboard layout for JWT verification |

---

## V2 roadmap

| Item | Notes |
|---|---|
| AWS migration | Move server to ECS/Fargate or Lambda; client stays on Vercel |
| Business switcher UI | Already supported by store — just needs the UI component |
| Invitation flow | `membership/` module — invite by email, accept flow |
| Dark mode | CSS tokens are defined; just wire up the `.dark` class toggle |
| SMS provider | `forgotPassword` logs OTP to console in dev — needs a real provider |
| Zustand persistence | On page refresh Zustand is empty — `zustand/middleware/persist` to localStorage |
