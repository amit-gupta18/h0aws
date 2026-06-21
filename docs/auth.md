# Auth — API Reference
**Status:** Implemented  
**Last Updated:** June 2026

---

## Design principle

Auth is identity only. The access token proves *who you are* (`userId`, `email`) — not what business you belong to or what role you have. Tenant + role are resolved per-request by the `businessContext` middleware from the `X-Business-Id` header. This means role changes and membership removals take effect immediately, with no stale-JWT window.

---

## Token model

| Token | Lifetime | Client storage | Server storage |
|---|---|---|---|
| Access token | 1 hour | Zustand (memory) | Nowhere — stateless JWT |
| Refresh token | 7 days | httpOnly cookie (set by Express) | DB — SHA-256 hash in `RefreshToken` table |
| OTP | 10 min | — | Redis — TTL auto-deletes |
| Reset token | 10 min | Client memory | Redis — TTL auto-deletes |

**Refresh token rotation:** every `/auth/refresh` deletes the old row and creates a new one. A stolen token is detected the moment the legitimate user tries to refresh — the consumed token is gone.

---

## JWT payload

```typescript
{
  userId: string   // User.id
  email:  string   // User.email
}
```

Business and role are **not** in the token. They are resolved on every request from `BusinessMember` using the `X-Business-Id` header.

---

## Endpoints

Base URL: `/api/v1/auth`

---

### POST /auth/signup

Creates a User (identity only). No business, no membership. Response includes an empty `memberships` array — the client routes the user to `/onboarding` to create their business.

**Request**
```json
{
  "email": "amit@example.com",
  "password": "min8chars",
  "phone": "9876543210"   // optional
}
```

**Response 201**
```json
{
  "accessToken": "<jwt>",
  "user": { "id": "uuid", "email": "amit@example.com" },
  "memberships": []
}
```

**Side effects:** creates `User`, creates `RefreshToken` row, sets `refreshToken` httpOnly cookie.

---

### POST /auth/login

**Request**
```json
{
  "email": "amit@example.com",
  "password": "yourpassword"
}
```

**Response 200**
```json
{
  "accessToken": "<jwt>",
  "user": { "id": "uuid", "email": "amit@example.com" },
  "memberships": [
    { "businessId": "uuid", "tradeName": "Sharma Traders", "role": "OWNER" },
    { "businessId": "uuid", "tradeName": "Gupta Stores", "role": "ACCOUNTANT" }
  ]
}
```

`memberships` is ordered by `createdAt asc`. Client auto-selects when exactly one exists. Multiple memberships → show business switcher.

**Side effects:** creates `RefreshToken` row, sets httpOnly cookie.

---

### POST /auth/refresh

No body — refresh token comes via httpOnly cookie automatically.

**Response 200**
```json
{ "accessToken": "<new jwt>" }
```

**Response 401** — token not in DB, expired, or already consumed (rotation).

**Side effects:** deletes old `RefreshToken` row, creates new one, sets new httpOnly cookie.

---

### POST /auth/logout

Requires `authenticate` middleware (Bearer token).

**Response 200**
```json
{ "message": "Logged out" }
```

**Side effects:** deletes this device's `RefreshToken` row, clears cookie. Other devices unaffected.

---

### POST /auth/forgot-password

Rate limited: 5 requests / 15 min.

**Request**
```json
{ "phone": "9876543210" }
```

**Response 200**
```json
{ "message": "If that phone is registered, an OTP has been sent" }
```

Silent — same response whether phone exists or not (don't reveal registration status).

**Side effects:** stores OTP in Redis at `otp:{phone}` with 10-min TTL. SMS send is a TODO placeholder — logs to console in dev.

---

### POST /auth/verify-otp

Rate limited: 10 requests / 15 min.

**Request**
```json
{ "phone": "9876543210", "otp": "482910" }
```

**Response 200**
```json
{ "resetToken": "<short-lived token>" }
```

**Response 400** — OTP invalid or expired.

**Side effects:** deletes OTP from Redis, stores reset token in Redis at `reset:{resetToken}` with 10-min TTL, value is `userId`.

---

### POST /auth/reset-password

**Request**
```json
{
  "resetToken": "<token from verify-otp>",
  "newPassword": "newmin8chars"
}
```

**Response 200**
```json
{ "message": "Password updated" }
```

**Side effects:** deletes reset token from Redis, updates `User.passwordHash`, deletes ALL `RefreshToken` rows for that user (kicks all devices).

---

## File map

```
server/src/auth/
  auth.schema.ts      ← Zod: SignupSchema, LoginSchema, ForgotPasswordSchema, VerifyOtpSchema, ResetPasswordSchema
  auth.service.ts     ← business logic: bcrypt, JWT sign, Redis, token generation
  auth.controller.ts  ← HTTP: parse req, call service, set cookie, return JSON
  auth.route.ts       ← Express router: maps paths, applies rate limiters
```

---

## Edge cases

| Case | Handling |
|---|---|
| Signup with existing email | 409 Conflict |
| Login — wrong password | 401, generic message |
| Login — inactive or soft-deleted user | 401 |
| Refresh token not in DB | 401 — force re-login |
| Refresh token expired | 401 — force re-login |
| OTP expired | 400 — Redis TTL deleted it |
| Wrong OTP | 400 |
| Reset token expired | 400 — restart forgot-password flow |
| Logout with no cookie | 200 — idempotent |
| Stolen refresh token used | Legitimate user's next refresh 401s (token already consumed by attacker) |
