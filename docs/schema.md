# Rakhat — Database Schema

---

## Enums

| Enum | Values |
|---|---|
| `MemberRole` | `OWNER` · `ACCOUNTANT` · `VIEWER` |
| `GstinType` | `REGULAR` · `COMPOSITION` · `UNREGISTERED` |
| `InventoryTxType` | `OPENING_STOCK` · `PURCHASE` · `SALE` · `MANUAL_ADJUSTMENT` |
| `DocumentType` | `TAX_INVOICE` · `BILL_OF_SUPPLY` |
| `TransactionType` | `INTRA_STATE` · `INTER_STATE` |
| `InvoiceStatus` | `ISSUED` · `CANCELLED` |
| `PaymentMode` | `CASH` · `UPI` · `CARD` · `CREDIT` |

---

## ERD

```
┌──────────────────────┐           ┌──────────────────────────┐
│         User         │           │         Business          │
├──────────────────────┤           ├──────────────────────────┤
│ id            UUID PK│           │ id              UUID PK   │
│ email         unique │           │ tradeName       String    │
│ phone         String?│           │ legalName       String?   │
│ passwordHash  String │           │ gstin           String?   │
│ isActive      Boolean│           │ gstinType       GstinType │
│ deletedAt     Date?  │           │ address         String?   │
│ createdAt     Date   │           │ stateCode       String    │
│ updatedAt     Date   │           │ phone           String?   │
└──────────┬───────────┘           │ logoUrl         String?   │
           │                       │ invoicePrefix   String    │
           │                       │ createdAt       Date      │
           │                       │ updatedAt       Date      │
           │                       └────────────┬─────────────┘
           │                                    │
           │           ┌────────────────────────┘
           │           │
           ▼           ▼
┌───────────────────────────────┐
│         BusinessMember        │
├───────────────────────────────┤
│ id          UUID PK           │
│ userId      FK → User         │
│ businessId  FK → Business     │
│ role        MemberRole        │
│ createdAt   Date              │
│ UNIQUE (userId, businessId)   │
└───────────────────────────────┘


┌──────────────────────┐           ┌──────────────────────────┐
│       Location       │           │         Product           │
├──────────────────────┤           ├──────────────────────────┤
│ id          UUID PK  │           │ id            UUID PK     │
│ businessId  FK→Biz   │           │ businessId    FK→Business │
│ name        String   │           │ name          String      │
│ createdAt   Date     │           │ sku           String?     │
│ [default: Main Shop] │           │ hsnCode       String?     │
│ [no UI in V1]        │           │ gstRate       Decimal(5,2)│
└──────────┬───────────┘           │ unit          String      │
           │                       │ sellingPrice  Decimal     │
           │                       │ category      String?     │
           │                       │ isActive      Boolean     │
           │                       │ deletedAt     Date?       │
           │                       │ createdAt     Date        │
           │                       │ updatedAt     Date        │
           │                       │ UNIQUE (businessId, sku)  │
           │                       └────────────┬─────────────┘
           │                                    │
           └──────────────┐   ┌─────────────────┘
                          ▼   ▼
                   ┌──────────────────┐
                   │    Inventory     │
                   ├──────────────────┤
                   │ id         UUID PK│
                   │ productId  FK→Prd │
                   │ locationId FK→Loc │
                   │ quantity   Dec    │
                   │ createdAt  Date   │
                   │ updatedAt  Date   │
                   │ UNIQUE(prd, loc)  │
                   └──────────────────┘

┌──────────────────────────────────┐
│       InventoryTransaction       │
├──────────────────────────────────┤
│ id             UUID PK           │
│ productId      FK → Product      │
│ businessId     FK → Business     │
│ quantityChange Decimal(10,3)     │  ← positive = in, negative = out
│ type           InventoryTxType   │
│ sourceId       UUID?             │  ← invoiceId or purchaseId
│ performedById  FK → User         │
│ notes          String?           │
│ createdAt      Date              │
└──────────────────────────────────┘


┌──────────────────────┐           ┌──────────────────────────┐
│       Customer       │           │     InvoiceSequence       │
├──────────────────────┤           ├──────────────────────────┤
│ id             UUID PK│          │ businessId  PK + FK→Biz   │
│ businessId     FK→Biz │          │ prefix      String        │
│ name           String │          │ currentVal  Int           │
│ phone          String?│          │ [atomic increment]        │
│ email          String?│          │ [numbers never reused]    │
│ gstin          String?│          └──────────────────────────┘
│ stateCode      String?│
│ billingAddress String?│
│ deletedAt      Date?  │
│ createdAt      Date   │
│ updatedAt      Date   │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│                    Invoice                    │
├──────────────────────────────────────────────┤
│ id              UUID PK                       │
│ businessId      FK → Business                 │
│ customerId      FK → Customer  (nullable)     │
│ createdById     FK → User                     │
│ clientBillId    String unique                 │
│ invoiceNumber   String                        │
│ invoiceDate     Date                          │
│ documentType    DocumentType                  │
│ transactionType TransactionType               │
│ subtotal        Decimal(12,2)                 │
│ discount        Decimal(12,2)  default 0      │
│ taxableAmount   Decimal(12,2)                 │
│ cgstTotal       Decimal(12,2)  default 0      │
│ sgstTotal       Decimal(12,2)  default 0      │
│ igstTotal       Decimal(12,2)  default 0      │
│ grandTotal      Decimal(12,2)                 │
│ status          InvoiceStatus  default ISSUED  │
│ pdfUrl          String?                       │
│ createdAt       Date                          │
│ UNIQUE (businessId, invoiceNumber)            │
└────────────────┬─────────────┬───────────────┘
                 │             │
                 ▼             ▼
┌────────────────────┐  ┌──────────────────────┐
│      SaleItem      │  │       Payment         │
├────────────────────┤  ├──────────────────────┤
│ id           UUID  │  │ id          UUID PK   │
│ invoiceId    FK→Inv│  │ invoiceId   FK→Invoice│
│ productId    FK→Prd│  │ amount      Dec(12,2) │
│              (null)│  │ mode        PaymentMode│
│ nameSnapshot String│  │ paymentDate Date      │
│ hsnSnapshot  String│  │ notes       String?   │
│ unitSnapshot String│  │ createdAt   Date      │
│ unitPrice    Dec   │  └──────────────────────┘
│ quantity     Dec   │
│ discount     Dec   │  ← snapshot fields preserve product
│ gstRate      Dec   │    state at time of sale
│ taxableValue Dec   │
│ cgstAmount   Dec   │
│ sgstAmount   Dec   │
│ igstAmount   Dec   │
│ lineTotal    Dec   │
│ sortOrder    Int   │
└────────────────────┘


┌──────────────────────┐           ┌──────────────────────────┐
│     RefreshToken     │           │         Expense           │
├──────────────────────┤           ├──────────────────────────┤
│ id          UUID PK  │           │ id            UUID PK     │
│ userId      FK→User  │           │ businessId    FK→Business │
│ token       unique   │  ← SHA256 │ category      String      │
│ deviceInfo  String?  │    hash   │ amount        Dec(12,2)   │
│ createdAt   Date     │           │ description   String?     │
│ expiresAt   Date     │           │ expenseDate   Date        │
└──────────────────────┘           │ createdById   FK→User     │
                                   │ createdAt     Date        │
                                   │ [schema only — no UI V1]  │
                                   └──────────────────────────┘
```

---

## Relations

| From | Field | To | Type | Notes |
|---|---|---|---|---|
| `User` | `memberships` | `BusinessMember` | 1→N | user can belong to multiple businesses |
| `User` | `refreshTokens` | `RefreshToken` | 1→N | one row per device/session |
| `User` | `invoicesCreated` | `Invoice` | 1→N | audit trail for who created |
| `User` | `inventoryActions` | `InventoryTransaction` | 1→N | `performedBy` |
| `User` | `expensesCreated` | `Expense` | 1→N | `createdBy` |
| `Business` | `members` | `BusinessMember` | 1→N | |
| `Business` | `locations` | `Location` | 1→N | auto-created on signup |
| `Business` | `products` | `Product` | 1→N | |
| `Business` | `customers` | `Customer` | 1→N | |
| `Business` | `invoices` | `Invoice` | 1→N | |
| `Business` | `invoiceSequence` | `InvoiceSequence` | 1→1 | atomic counter |
| `Business` | `inventoryTransactions` | `InventoryTransaction` | 1→N | |
| `Business` | `expenses` | `Expense` | 1→N | |
| `Location` | `inventory` | `Inventory` | 1→N | |
| `Product` | `inventory` | `Inventory` | 1→N | stock per location |
| `Product` | `inventoryTransactions` | `InventoryTransaction` | 1→N | |
| `Product` | `saleItems` | `SaleItem` | 1→N | nullable — product may be deleted |
| `Customer` | `invoices` | `Invoice` | 1→N | nullable on invoice |
| `Invoice` | `saleItems` | `SaleItem` | 1→N | line items |
| `Invoice` | `payments` | `Payment` | 1→N | partial settlements allowed |

---

## Unique Constraints

| Table | Constraint |
|---|---|
| `User` | `email` |
| `BusinessMember` | `(userId, businessId)` — one role per business |
| `Product` | `(businessId, sku)` — SKU unique within a business |
| `Inventory` | `(productId, locationId)` — one stock row per product+location |
| `Invoice` | `(businessId, invoiceNumber)` — number unique within a business |
| `Invoice` | `clientBillId` — globally unique |
| `InvoiceSequence` | `businessId` (PK) — one sequence per business |
| `RefreshToken` | `token` (SHA-256 hash) |
