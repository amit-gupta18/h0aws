# Auth — plan.md
**Feature:** Authentication  
**Status:** Ready for implementation  
**Last Updated:** June 2026

---

## 1. Prisma Schema

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  phone        String?   @unique
  passwordHash String
  isActive     Boolean   @default(true)
  deletedAt    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  refreshTokens RefreshToken[]
  businessMembers BusinessMember[]
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  deviceInfo String?
  createdAt DateTime @default(now())
  expiresAt DateTime

  user User @relation(fields: [userId], references: [id])
}
```

**Notes:**
- OTP and reset tokens are NOT in the DB — stored in Redis with TTL
- One `RefreshToken` row per device per user — supports multi-device login
- `token` stored as hashed value (bcrypt or SHA-256) — never raw

---

## 2. API Contracts

### Base URL
```
/api/v1/auth
```

---

### POST /auth/signup

```
const accessToken = jwt.sign(
  { 
    userId: user.id,
    businessId: member.businessId,
    role: member.role 
  },
  JWT_SECRET,
  { expiresIn: '1h' }
)
```

**Request body:**
```json
{
  "email": "amit@example.com",
  "phone": "9876543210",
  "password": "min8chars"
}
```



**Response 201:**
```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "amit@example.com"
  }
}
```

**Side effects:**
- Creates `User` row
- Creates `RefreshToken` row in DB
- Sets refresh token in httpOnly cookie

---

### POST /auth/login

**Request body:**
```json
{
  "email": "amit@example.com",
  "password": "yourpassword"
}
```

**Response 200:**
```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "amit@example.com"
  }
}
```

**Side effects:**
- Verifies password hash
- Generates new refresh token for this device
- Saves new refresh token row to DB (old device tokens untouched)
- Sets refresh token in httpOnly cookie

---

### POST /auth/refresh

**Request:** No body — refresh token comes automatically via httpOnly cookie

**Response 200:**
```json
{
  "accessToken": "<new jwt>"
}
```

**Response 401:** If refresh token not found in DB, expired, or invalid

**Side effects (refresh token rotation):**
- Deletes old refresh token row from DB
- Creates new refresh token row in DB
- Sets new refresh token in httpOnly cookie

---

### POST /auth/logout

**Request:** No body — refresh token comes via httpOnly cookie

**Response 200:**
```json
{ "message": "Logged out" }
```

**Side effects:**
- Deletes that device's refresh token row from DB
- Clears httpOnly cookie on client
- Access token lives out its remaining lifetime (max 1 hour) — acceptable for V1

---

### POST /auth/forgot-password

**Request body:**
```json
{
  "phone": "9876543210"
}
```

**Response 200:**
```json
{ "message": "OTP sent" }
```

**Side effects:**
- Generates 6-digit OTP
- Stores in Redis: key `otp:{phone}`, value `{otp}`, TTL 10 minutes
- Sends OTP via SMS (V1: use any SMS provider)

---

### POST /auth/verify-otp

**Request body:**
```json
{
  "phone": "9876543210",
  "otp": "482910"
}
```

**Response 200:**
```json
{
  "resetToken": "<short lived token>"
}
```

**Response 400:** OTP invalid or expired

**Side effects:**
- Looks up `otp:{phone}` in Redis
- If match: deletes OTP from Redis, generates reset token
- Stores in Redis: key `reset:{resetToken}`, value `{userId}`, TTL 10 minutes

---

### POST /auth/reset-password

**Request body:**
```json
{
  "resetToken": "<token from verify-otp>",
  "newPassword": "newmin8chars"
}
```

**Response 200:**
```json
{ "message": "Password updated" }
```

**Side effects:**
- Looks up `reset:{resetToken}` in Redis → gets userId
- Deletes reset token from Redis
- Updates `User.passwordHash`
- Deletes ALL `RefreshToken` rows for that user (invalidates all devices)

---

## 3. Zod Validation Schemas

```typescript
// shared/schemas/auth.ts

export const SignupSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  password: z.string().min(8),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const ForgotPasswordSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
})

export const VerifyOtpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  otp: z.string().length(6),
})

export const ResetPasswordSchema = z.object({
  resetToken: z.string().min(1),
  newPassword: z.string().min(8),
})
```

---

## 4. Token Configuration

| Token | Lifetime | Storage (client) | Storage (server) |
|---|---|---|---|
| Access token | 1 hour | Memory (JS variable) | Nowhere (stateless JWT) |
| Refresh token | 7 days | httpOnly cookie | DB (RefreshToken table) |
| OTP | 10 minutes | — | Redis (TTL auto-deletes) |
| Reset token | 10 minutes | Client memory | Redis (TTL auto-deletes) |

---

## 5. Decisions & Reasoning

**Why two tokens instead of one long-lived JWT?**  
Single long-lived JWT cannot be invalidated without a blocklist. Two tokens give short exposure window on access token and controlled invalidation via refresh token in DB.

**Why httpOnly cookie for refresh token?**  
JavaScript cannot read httpOnly cookies — XSS attacks cannot steal the refresh token. Access token in memory is fine because it's short-lived (1 hour max damage window).

**Why refresh token rotation?**  
Every `/auth/refresh` call generates a new refresh token and deletes the old one. If a stolen refresh token is used, the legitimate user's next refresh attempt fails (token already consumed), alerting them to the breach.

**Why one RefreshToken row per device?**  
Supports multi-device login. Logout on one device doesn't kick other devices. "Logout all devices" deletes all rows for that userId.

**Why Redis for OTP and reset token?**  
Both are short-lived and temporary. Storing in DB accumulates junk that needs cleanup jobs. Redis TTL handles expiry automatically — key disappears after 10 minutes with zero extra work.

**Why invalidate all refresh tokens on password reset?**  
If a device is stolen, the user changes password to kick out all sessions. All RefreshToken rows deleted — every device must log in again with new credentials.

---

## 6. Edge Cases

| Case | Handling |
|---|---|
| Signup with existing email | 409 Conflict |
| Login with wrong password | 401, generic message (don't reveal if email exists) |
| Refresh token not in DB | 401 — force login |
| Refresh token expired | 401 — force login |
| OTP expired (>10 min) | 400 — Redis TTL has deleted it, lookup fails |
| OTP wrong | 400 — do not reveal remaining attempts in V1 |
| Reset token expired | 400 — user must restart forgot-password flow |
| Logout with no cookie | 200 — idempotent, nothing to delete |
| User is inactive (isActive=false) | 401 on login |
| User soft deleted (deletedAt set) | 401 on login |

---

## 7. Implementation Checklist

### Prisma
- [ ] Add `User` model to schema.prisma
- [ ] Add `RefreshToken` model to schema.prisma
- [ ] Run `prisma migrate dev`

### Middleware
- [ ] `authenticate` middleware — verifies access token JWT, attaches `req.user`
- [ ] Cookie parser middleware configured for httpOnly cookies

### Routes
- [ ] `POST /auth/signup`
- [ ] `POST /auth/login`
- [ ] `POST /auth/refresh`
- [ ] `POST /auth/logout`
- [ ] `POST /auth/forgot-password`
- [ ] `POST /auth/verify-otp`
- [ ] `POST /auth/reset-password`

### Validation
- [ ] Zod schemas in `/shared/schemas/auth.ts`
- [ ] Validation middleware applied to all auth routes

### Redis
- [ ] OTP storage and TTL on `/forgot-password`
- [ ] OTP lookup and deletion on `/verify-otp`
- [ ] Reset token storage and TTL on `/verify-otp`
- [ ] Reset token lookup and deletion on `/reset-password`

### Security
- [ ] Passwords hashed with bcrypt (cost factor 12)
- [ ] Refresh tokens hashed before storing in DB
- [ ] JWT signed with `JWT_SECRET` env var
- [ ] httpOnly + Secure + SameSite=Strict on refresh token cookie
- [ ] Rate limiting on `/forgot-password` and `/verify-otp` (prevent OTP brute force)

### Testing
- [ ] Signup happy path
- [ ] Login happy path
- [ ] Refresh token rotation
- [ ] Logout clears cookie and DB row
- [ ] Password reset full flow
- [ ] Expired OTP returns 400
- [ ] Stolen refresh token scenario (rotation catches it)