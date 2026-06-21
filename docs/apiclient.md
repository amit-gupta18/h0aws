# API Client — plan.md
**Feature:** HTTP Client + Auth Interceptor  
**Status:** Ready for implementation  
**Last Updated:** June 2026

---

## 1. Why ky

- Zero dependencies — no supply chain risk
- Built on native `fetch`
- Supports hooks (before/after request) — clean interceptor pattern
- Lightweight — good for PWA bundle size

---

## 2. Setup

```typescript
// lib/api.ts
import ky from 'ky'
import { useAuthStore } from '@/store/authStore'

export const api = ky.create({
  prefixUrl: '/api/v1',
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().accessToken
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`)
        }
      }
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          try {
            // call /auth/refresh — httpOnly cookie sent automatically
            const data = await ky.post('/api/v1/auth/refresh').json<{ accessToken: string }>()

            // update Zustand with new access token
            useAuthStore.getState().setAccessToken(data.accessToken)

            // retry original request with new token
            return ky(request)
          } catch {
            // refresh failed — clear store and redirect to login
            useAuthStore.getState().clearAuth()
            window.location.href = '/login'
          }
        }
      }
    ]
  }
})
```

---

## 3. Usage

Every API call in Rakhat uses `api` instead of raw `fetch`:

```typescript
// GET
const invoices = await api.get('invoices').json()

// POST
const invoice = await api.post('invoices', { json: payload }).json()

// PUT
await api.put(`invoices/${id}`, { json: payload })

// DELETE
await api.delete(`invoices/${id}`)
```

---

## 4. Flow

```
API call made
  → beforeRequest: attach access token to Authorization header
  → server responds
  → 200: return response normally
  → 401: 
      → call /auth/refresh (httpOnly cookie sent automatically)
      → success: update Zustand with new access token → retry original request
      → fail: clear Zustand → redirect to /login
```

---

## 5. Decisions & Reasoning

**Why ky over axios?**  
Zero dependencies — smaller attack surface. Built on native fetch. Sindre Sorhus maintains it — extremely reliable. Clean hook API for interceptors.

**Why attach token in `beforeRequest` hook?**  
Access token lives in Zustand (memory). Every request needs the latest token, especially after a silent refresh. Reading from `useAuthStore.getState()` always gets the current value.

**Why `useAuthStore.getState()` instead of `useAuthStore()`?**  
`useAuthStore()` is a React hook — only works inside components. `getState()` is Zustand's way to access store outside React components.

**Why redirect to `/login` when refresh fails?**  
Refresh token expired or invalid means the session is dead. No recovery possible — user must log in again.

---

## 6. Implementation Checklist

- [ ] Install `ky`: `npm install ky`
- [ ] Create `lib/api.ts`
- [ ] `beforeRequest` hook attaches access token
- [ ] `afterResponse` hook handles 401 → refresh → retry
- [ ] Failed refresh → `clearAuth()` → redirect to `/login`
- [ ] All API calls in the app use `api` from `lib/api.ts` — never raw `fetch`