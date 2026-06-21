# API Client
**Status:** Implemented  
**Last Updated:** June 2026

---

## Setup

`lib/api.ts` — a single `ky` instance used for all API calls in the app.

```typescript
import ky from 'ky'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1'

export const api = ky.create({
  prefix: BASE_URL,   // ky v1+ uses prefix, not prefixUrl
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const { accessToken, activeBusinessId } = useAuthStore.getState()
        if (accessToken) {
          request.headers.set('Authorization', `Bearer ${accessToken}`)
        }
        if (activeBusinessId) {
          request.headers.set('X-Business-Id', activeBusinessId)
        }
      },
    ],
    afterResponse: [
      async ({ request, response }) => {
        if (response.status === 401) {
          try {
            const data = await ky
              .post(`${BASE_URL}/auth/refresh`, { credentials: 'include' })
              .json<{ accessToken: string }>()

            useAuthStore.getState().setAccessToken(data.accessToken)
            return ky(request)   // retry original request with new token
          } catch {
            useAuthStore.getState().clearAuth()
            window.location.href = '/login'
          }
        }
      },
    ],
  },
})
```

---

## Request headers sent on every call

| Header | Value | Set by |
|---|---|---|
| `Authorization` | `Bearer <accessToken>` | `beforeRequest` hook — from Zustand |
| `X-Business-Id` | active business UUID | `beforeRequest` hook — from Zustand |

The server's `businessContext` middleware reads `X-Business-Id` to resolve the tenant and verify the user's role on every request. If it's missing, the middleware returns 400.

---

## 401 handling (silent refresh)

```
Request → 401
  → POST /auth/refresh  (httpOnly refreshToken cookie sent automatically)
      → success: setAccessToken(newToken) → retry original request
      → fail:    clearAuth() → window.location.href = '/login'
```

The retry is transparent — callers never see the 401 unless the refresh itself fails.

---

## Usage

```typescript
import { api } from '@/lib/api'

// GET
const invoices = await api.get('invoices').json()

// POST
const invoice = await api.post('invoices', { json: payload }).json()

// PUT
await api.put(`invoices/${id}`, { json: payload })

// DELETE
await api.delete(`invoices/${id}`)
```

Always use `api`, never raw `fetch` or a separate `ky` instance — the hooks only run on this instance.

---

## Error handling in components

```typescript
import { HTTPError } from 'ky'

try {
  const data = await api.post('auth/login', { json: body }).json()
} catch (err) {
  if (err instanceof HTTPError) {
    const body = await err.response
      .json<{ error?: string }>()
      .catch((): { error?: string } => ({}))
    setError(body.error ?? 'Request failed')
  } else {
    setError('Could not reach the server')
  }
}
```

---

## Env var

| Var | Dev default | Production |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | Set in Vercel dashboard to Render URL |

---

## Why ky over axios

- Zero dependencies — no supply chain risk
- Built on native `fetch`
- Typed hook API (`BeforeRequestState`, `AfterResponseState`) — no `any` needed
- Lightweight — good for PWA bundle size
- `useAuthStore.getState()` works outside React components (unlike the `useAuthStore()` hook)
