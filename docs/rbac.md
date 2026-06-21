# RBAC & Sidebar — plan.md
**Feature:** Role-Based Access Control + Sidebar  
**Status:** Implemented  
**Last Updated:** June 2026

---

## 1. Roles

Defined in Prisma as enum on `BusinessMember`:

```prisma
enum Role {
  OWNER
  ACCOUNTANT
  VIEWER
}
```

---

## 2. Access Matrix

| Sidebar Item | OWNER | ACCOUNTANT | VIEWER |
|---|---|---|---|
| Sales | ✅ full access | ✅ view only | ❌ |
| Customers | ✅ full access | ✅ view only | ❌ |
| Inventory | ✅ full access | ✅ view only | ✅ view only |
| Payments | ✅ full access | ✅ view only | ❌ |
| Insights | ✅ full access | ❌ | ❌ |

**View only** means: can see data, cannot create, edit, or delete.

---

## 3. Sidebar Config

```typescript
// config/sidebar.ts

export type SidebarItem = {
  label: string
  href: string
  icon: string
  roles: Role[]
}

export const sidebarItems: SidebarItem[] = [
  { label: 'Sales',     href: '/dashboard/sales',     icon: 'receipt',   roles: ['OWNER', 'ACCOUNTANT'] },
  { label: 'Customers', href: '/dashboard/customers', icon: 'users',     roles: ['OWNER', 'ACCOUNTANT'] },
  { label: 'Inventory', href: '/dashboard/inventory', icon: 'box',       roles: ['OWNER', 'ACCOUNTANT', 'VIEWER'] },
  { label: 'Payments',  href: '/dashboard/payments',  icon: 'wallet',    roles: ['OWNER', 'ACCOUNTANT'] },
  { label: 'Insights',  href: '/dashboard/insights',  icon: 'bar-chart', roles: ['OWNER'] },
]
```

---

## 4. Zustand Auth Store

```typescript
// store/authStore.ts

type AuthState = {
  userId: string | null
  businessId: string | null
  role: Role | null
  accessToken: string | null
  setAuth: (payload: { userId: string; businessId: string; role: Role; accessToken: string }) => void
  setAccessToken: (accessToken: string) => void
  clearAuth: () => void
}
```

Populated after login/signup from the API response. `setAccessToken` is called by the API client after a silent token refresh.

---

## 5. Sidebar Component

Client component — reads role from Zustand, filters `sidebarItems`, highlights active route.

```typescript
// components/Sidebar.tsx
'use client'

const visibleItems = sidebarItems.filter((item) => item.roles.includes(role))
```

---

## 6. Route Protection — Two Layers

### Layer 1 — proxy.ts (cookie presence only)

`proxy.ts` runs on Node runtime. It does one thing: check that the `accessToken` cookie exists. If not, redirect to `/login`. No JWT verification, no role checks.

```typescript
// proxy.ts
export function proxy(req: NextRequest) {
  const token = req.cookies.get('accessToken')?.value
  if (!token) return NextResponse.redirect(new URL('/login', req.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

**Why no role check here?** The proxy is a fast gate — unauthenticated users bounce immediately. Role enforcement requires decoding the JWT and comparing against the route map, which belongs in the layout where you have full context and can redirect with proper UX.

### Layer 2 — dashboard/layout.tsx (role enforcement)

The dashboard layout is a server component. It decodes the JWT from the cookie, extracts the role, and redirects to `/403` if the role is not allowed for the current route.

```typescript
// app/dashboard/layout.tsx (server component)
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify } from 'jose' // or jsonwebtoken — Node runtime available

const routeRoles: Record<string, Role[]> = {
  '/dashboard/sales':     ['OWNER', 'ACCOUNTANT'],
  '/dashboard/customers': ['OWNER', 'ACCOUNTANT'],
  '/dashboard/inventory': ['OWNER', 'ACCOUNTANT', 'VIEWER'],
  '/dashboard/payments':  ['OWNER', 'ACCOUNTANT'],
  '/dashboard/insights':  ['OWNER'],
}

export default async function DashboardLayout({ children }) {
  const token = (await cookies()).get('accessToken')?.value
  if (!token) redirect('/login')

  const { payload } = await jwtVerify(token, secret)
  const role = payload.role as Role
  // check current path against routeRoles, redirect('/403') if not allowed
  ...
}
```

---

## 7. JWT Payload (from Auth)

```typescript
{
  userId: string
  businessId: string | null
  role: 'OWNER' | 'ACCOUNTANT' | 'VIEWER' | null
}
```

Signed at login/signup in `auth.service.ts`. Role is read from the first `BusinessMember` row for the user.

---

## 8. Decisions & Reasoning

**Why cookie presence only in proxy.ts?**  
proxy.ts is a fast network gate — its only job is to block completely unauthenticated requests before they hit the page. Role enforcement needs route context and better UX (a proper /403 page), which belongs in layout.tsx. Doing JWT verification in the proxy adds latency to every request with no benefit since the layout re-verifies anyway.

**Why role enforcement in layout.tsx?**  
Server component layouts run before the page renders, so unauthorized users never see protected content. They also have access to the full request context (headers, cookies, pathname) via Next.js server APIs, making the role check straightforward without Edge runtime constraints.

**Why client component for sidebar?**  
Sidebar reads from Zustand (client state). Zustand is not available in server components.

**Why role in JWT payload?**  
The layout has no direct DB access pattern per request. Reading role from the JWT avoids a DB call on every page navigation. Role changes take effect on next login (acceptable for V1).

**Why filter sidebar by role instead of hiding individual buttons?**  
Cleaner UX — unauthorized users never see options they can't use.

---

## 9. Edge Cases

| Case | Handling |
|---|---|
| No cookie | proxy.ts redirects to /login before page loads |
| Valid cookie, wrong role | layout.tsx redirects to /403 |
| Expired token | JWT verification fails in layout.tsx → redirect /login |
| User with no BusinessMember row | role is null in JWT → treated as unauthorized |
| Role changes while user is logged in | Takes effect on next login (JWT has old role until re-auth) |
| VIEWER hits /dashboard/sales by URL | proxy lets through (cookie present), layout.tsx catches → /403 |

---

## 10. File Map

| File | Purpose |
|---|---|
| `proxy.ts` | Cookie presence gate only |
| `app/dashboard/layout.tsx` | JWT decode + role enforcement |
| `components/Sidebar.tsx` | Client component, filters by Zustand role |
| `config/sidebar.ts` | Route → allowed roles map |
| `store/authStore.ts` | Zustand: userId, businessId, role, accessToken |
| `shared/types.ts` | `Role` type |
| `app/(auth)/login/page.tsx` | Redirect target when unauthenticated |
| `app/403/page.tsx` | Redirect target when role not allowed |
