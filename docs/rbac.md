# RBAC & Route Protection
**Status:** Implemented  
**Last Updated:** June 2026

---

## Roles

```prisma
enum MemberRole {
  OWNER
  ACCOUNTANT
  VIEWER
}
```

Role lives on `BusinessMember`, not on `User`. A user can be OWNER of one business and ACCOUNTANT of another.

---

## Access matrix

| Sidebar Item | OWNER | ACCOUNTANT | VIEWER |
|---|---|---|---|
| Sales | ✅ full | ✅ view only | ❌ |
| Customers | ✅ full | ✅ view only | ❌ |
| Inventory | ✅ full | ✅ view only | ✅ view only |
| Payments | ✅ full | ✅ view only | ❌ |
| Insights | ✅ full | ❌ | ❌ |

View only = can read data, cannot create / edit / delete.

---

## Protection layers

### Layer 1 — proxy.ts (presence gate)

Runs at the network edge before any page renders. Single check: does the `refreshToken` httpOnly cookie exist? If not, redirect to `/login`.

```typescript
// proxy.ts
export function proxy(req: NextRequest) {
  const token = req.cookies.get('refreshToken')?.value
  if (!token) return NextResponse.redirect(new URL('/login', req.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding'],
}
```

Checks `refreshToken` (not `accessToken`) because it's the httpOnly cookie set by Express — no client-side cookie manipulation needed.

### Layer 2 — dashboard/layout.tsx (role enforcement)

Server component runs before the page renders. Decodes the JWT to get `userId`, reads `X-Business-Id`, looks up the `BusinessMember` row, and checks the role against the route. Redirects to `/403` if the role is not allowed.

Role is resolved fresh from the DB on every request — changes take effect immediately.

```typescript
// app/dashboard/layout.tsx (server component — to be implemented)
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import jwt from 'jsonwebtoken'

const routeRoles: Record<string, MemberRole[]> = {
  '/dashboard/sales':     ['OWNER', 'ACCOUNTANT'],
  '/dashboard/customers': ['OWNER', 'ACCOUNTANT'],
  '/dashboard/inventory': ['OWNER', 'ACCOUNTANT', 'VIEWER'],
  '/dashboard/payments':  ['OWNER', 'ACCOUNTANT'],
  '/dashboard/insights':  ['OWNER'],
}
```

### Layer 3 — requireRole middleware (API enforcement)

Applied per route on the Express server. Runs after `authenticate` + `businessContext`.

```typescript
// usage in any feature router
router.delete('/products/:id',
  authenticate,
  businessContext,
  requireRole('OWNER'),
  ProductController.delete
)
```

`businessContext` resolves the role fresh from `BusinessMember` on every request — not from the JWT.

---

## Server middleware chain

```
Request
  → authenticate          verifies JWT → req.user = { userId, email }
  → businessContext       reads X-Business-Id header
                          findUnique BusinessMember(userId, businessId)
                          → 403 if no membership
                          → req.context = { businessId, role }
  → requireRole('OWNER')  checks req.context.role
  → controller
```

File locations:
```
server/src/common/middleware/
  authenticate.ts       ← identity only
  business-context.ts   ← tenant + role resolution
  require-role.ts       ← RBAC guard factory
```

---

## Sidebar (client)

Client component. Reads the active membership's role from Zustand via `useActiveRole()`, filters `sidebarItems` by role, highlights the active route.

```typescript
// components/Sidebar.tsx
const role = useActiveRole()  // derived from activeBusinessId + memberships[]
const visibleItems = sidebarItems.filter(item => item.roles.includes(role))
```

Role comes from the `memberships[]` returned on login — not from the JWT. Always fresh after login.

---

## Edge cases

| Case | Layer that catches it |
|---|---|
| No session at all | proxy.ts → `/login` |
| Session expired (no valid refreshToken cookie) | proxy.ts → `/login` |
| Valid session, wrong role for route | dashboard/layout.tsx → `/403` |
| VIEWER hits `/dashboard/sales` directly | proxy passes (cookie present), layout catches → `/403` |
| User removed from business while logged in | businessContext middleware → 403 on next request |
| Role changed while logged in | businessContext reads fresh DB row → instant effect |

---

## File map

| File | Purpose |
|---|---|
| `proxy.ts` | Network gate — presence check only |
| `app/dashboard/layout.tsx` | JWT decode + role enforcement (server component) |
| `components/Sidebar.tsx` | Client — filters nav items by active role |
| `config/sidebar.ts` | Route → allowed roles map |
| `store/authStore.ts` | `memberships[]`, `activeBusinessId`, `useActiveRole()` |
| `shared/types.ts` | `Role`, `Membership` types |
| `app/(auth)/login/page.tsx` | Redirect target when unauthenticated |
| `app/403/page.tsx` | Redirect target when role not allowed |
