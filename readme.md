# h0aws — H0: Hack the Zero Stack

Full-stack TypeScript monorepo built for the [H0: Hack the Zero Stack](https://h01.devpost.com) hackathon. Combines Vercel's v0/Next.js frontend with AWS Aurora PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + Tailwind CSS v4 + shadcn/ui |
| Backend | Express 5 + TypeScript (ESM) |
| Database | Amazon Aurora PostgreSQL Serverless v2 |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Auth | bcrypt + JWT |
| Validation | Zod |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |
| CI | Travis CI (build gate on every PR) |

---

## Project Structure

```
h0aws/
├── client/          # Next.js frontend
├── server/          # Express backend
│   ├── src/
│   │   ├── index.ts         # Entry point
│   │   └── lib/
│   │       └── prisma.ts    # Prisma client singleton
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # Migration history
│   ├── prisma.config.ts     # Prisma 7 config (datasource + SSL)
│   └── package.json
├── .travis.yml      # CI pipeline
└── render.yaml      # Render deployment config
```

---

## Database Schema

13 models covering a full B2B invoicing system:

- **User** — authentication, roles
- **Business** — multi-tenant org entity
- **BusinessMember** — user ↔ business with roles (OWNER / ACCOUNTANT / VIEWER)
- **Location** — physical locations per business
- **Product** — inventory items with GST rates
- **Inventory** — stock levels per product per location
- **InventoryTransaction** — audit log for stock changes
- **Customer** — business customers
- **InvoiceSequence** — atomic invoice numbering per business
- **Invoice** — tax invoices / bill of supply with GST breakdown
- **SaleItem** — line items with product snapshots at time of sale
- **Payment** — partial payment support per invoice
- **Expense** — business expense tracking

---

## CI/CD Pipeline

### Travis CI (Build Gate)

Every PR triggers two parallel build jobs. Both must pass before merge is allowed.

```
PR opened
  → Server — TypeScript  (prisma generate + tsc)
  → Client — Next.js     (next build)
  → both pass → PR can merge
  → either fails → PR blocked
```

### Deployment (on merge to main)

```
main ← merged PR
  → Vercel  auto-deploys client (native GitHub integration)
  → Render  auto-deploys server (native GitHub integration)
              └─ pre-deploy: npx prisma migrate deploy
              └─ start:      node dist/index.js
```

### Branch Protection

GitHub branch protection on `main`:
- PRs required before merging (no direct push)
- Required status checks: `Server — TypeScript` + `Client — Next.js`

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL (or use the Aurora connection directly)

### Setup

```bash
# Clone
git clone https://github.com/amit-gupta18/h0aws.git
cd h0aws

# Server
cd server
cp .env.example .env          # fill in DATABASE_URL
npm install
npx prisma migrate dev        # run migrations
npm run dev                   # tsx watch src/index.ts

# Client (separate terminal)
cd client
npm install
npm run dev                   # next dev
```

### Environment Variables

**`server/.env`**

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public&sslmode=no-verify"
```

> Note: special characters in the password must be URL-encoded (e.g. `#` → `%23`)

---

## API

### Health Check

```
GET /health
```

Response:
```json
{ "status": "ok", "db": "connected" }
```

Returns `503` if the database is unreachable.

---

## AWS Setup

- **Database:** Amazon Aurora PostgreSQL Serverless v2 (`us-east-1`)
- **Security group:** inbound PostgreSQL (port 5432) open to Render outbound IPs + your local IP
- **Publicly accessible:** Yes (required for Render → Aurora connectivity)
- **SSL:** required — connection string uses `sslmode=no-verify`, Prisma client uses `{ rejectUnauthorized: false }`

### Render → Aurora Security Group Rules

| Source | Port |
|--------|------|
| `74.220.48.0/24` | 5432 |
| `74.220.56.0/24` | 5432 |
| `216.151.17.91/32` | 5432 |
| `216.151.17.92/32` | 5432 |
| Your local IP | 5432 |

---

## Migrations

```bash
# Create and apply a new migration (local dev)
cd server && npx prisma migrate dev --name <migration_name>

# Apply pending migrations (production — runs automatically on Render pre-deploy)
npx prisma migrate deploy

# Open Prisma Studio (DB browser)
npx prisma studio
```
