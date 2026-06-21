# Rakhat — Design System v1
**Last Updated:** June 2026  
**Status:** Active — V1 Light mode only. Dark mode tokens defined, activated in V2.

---

## 1. Brand

**Product:** Rakhat — GST billing for Indian SMBs  
**Personality:** Trustworthy, fast, no-nonsense. A shop owner shouldn't feel like they're using enterprise software.  
**Reference:** Atlassian (density, color confidence) × Swipe (billing-first simplicity)

---

## 2. Color

### Primary

| Name | Value | Usage |
|---|---|---|
| Primary | `#0052CC` | CTA buttons, links, active nav, focus rings |
| Primary Hover | `#0747A6` | Button hover, pressed state |
| Primary Subtle | `#DEEBFF` | Selected rows, badge bg, highlight |
| Primary Foreground | `#FFFFFF` | Text on primary buttons |

### Surface

| Name | Value | Usage |
|---|---|---|
| Surface | `#FFFFFF` | Cards, modals, sidebar |
| Surface Raised | `#F7F8FA` | Page background |
| Surface Overlay | `#F4F5F7` | Input backgrounds, table row hover |

### Border

| Name | Value | Usage |
|---|---|---|
| Border | `#DFE1E6` | Default dividers, input borders, card outlines |
| Border Strong | `#B3BAC5` | Focused inputs, emphasized dividers |

### Text

| Name | Value | Usage |
|---|---|---|
| Text Primary | `#172B4D` | Headings, labels, body |
| Text Secondary | `#5E6C84` | Subtext, metadata, placeholders |
| Text Disabled | `#A5ADBA` | Disabled inputs and labels |

### Status

| Name | Value | Usage |
|---|---|---|
| Success | `#00875A` | ISSUED invoice, positive amounts |
| Success Subtle | `#E3FCEF` | Success badge background |
| Warning | `#FF991F` | Pending payment, partial settlement |
| Warning Subtle | `#FFFAE6` | Warning badge background |
| Danger | `#DE350B` | CANCELLED invoice, errors, delete |
| Danger Subtle | `#FFEBE6` | Error badge background, destructive hover |

---

## 3. Dark Mode (V2)

Dark tokens are defined now, activated in V2 by toggling a `.dark` class.

| Name | Light | Dark |
|---|---|---|
| Primary | `#0052CC` | `#2684FF` |
| Primary Hover | `#0747A6` | `#4C9AFF` |
| Primary Subtle | `#DEEBFF` | `#0A2966` |
| Surface | `#FFFFFF` | `#161B22` |
| Surface Raised | `#F7F8FA` | `#1C2330` |
| Surface Overlay | `#F4F5F7` | `#252D3A` |
| Border | `#DFE1E6` | `#2D3748` |
| Border Strong | `#B3BAC5` | `#4A5568` |
| Text Primary | `#172B4D` | `#E2E8F0` |
| Text Secondary | `#5E6C84` | `#A0AEC0` |
| Text Disabled | `#A5ADBA` | `#4A5568` |
| Success | `#00875A` | `#36B37E` |
| Warning | `#FF991F` | `#FFAB00` |
| Danger | `#DE350B` | `#FF5630` |

---

## 4. Typography

**Font:** Inter (variable font, weights 400–700)  
**Mono Font:** JetBrains Mono (invoice numbers, amounts, codes)

| Role | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| Display | 24px | 700 | 32px | Page titles |
| Heading | 18px | 600 | 28px | Section headers, card titles |
| Subheading | 14px | 600 | 20px | Table column headers, field labels |
| Body | 14px | 400 | 20px | General content, descriptions |
| Small | 12px | 400 | 16px | Captions, timestamps, metadata |
| Mono | 13px | 400 | 20px | Invoice numbers, GST amounts, totals |

**Rules:**
- Always sentence case for UI labels — never ALL CAPS
- Numbers and currency values use Mono font
- Avoid mixing more than two weights on a single screen

---

## 5. Spacing

Base unit: **4px**

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Tight gaps, icon padding |
| `space-2` | 8px | Between inline elements |
| `space-3` | 12px | Input internal padding |
| `space-4` | 16px | Card padding, section gaps |
| `space-5` | 20px | — |
| `space-6` | 24px | Between cards, form sections |
| `space-8` | 32px | Page section separation |
| `space-10` | 40px | Large layout gaps |
| `space-12` | 48px | — |
| `space-16` | 64px | Page-level padding |

---

## 6. Border Radius

Squircle feel — small radii, not pill-shaped.

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 4px | Badges, status tags, small chips |
| `radius-md` | 6px | Buttons, inputs, dropdowns |
| `radius-lg` | 8px | Cards, table containers, modals |
| `radius-xl` | 12px | Bottom sheets, drawers, sidepanels |

---

## 7. Shadows

| Token | Value | Usage |
|---|---|---|
| `shadow-card` | `0 1px 3px rgba(0,0,0,0.08)` | Default card elevation |
| `shadow-dropdown` | `0 4px 12px rgba(0,0,0,0.10)` | Dropdowns, tooltips |
| `shadow-modal` | `0 8px 24px rgba(0,0,0,0.12)` | Modals, drawers |

---

## 8. Iconography

**Library:** Lucide Icons (V1)  
**Size:** 16px inline, 20px standalone actions  
**Stroke:** 1.5px  
**Color:** Inherits from text color — never hardcoded

---

## 9. Status Badges

Used across invoices, payments, inventory.

| Status | Background | Text |
|---|---|---|
| ISSUED | Success Subtle `#E3FCEF` | Success `#00875A` |
| CANCELLED | Danger Subtle `#FFEBE6` | Danger `#DE350B` |
| CASH | `#EAF0FB` | `#0052CC` |
| UPI | `#F3E8FF` | `#6B21A8` |
| CARD | `#FFF3E0` | `#C2410C` |
| CREDIT | `#FEFCE8` | `#92400E` |

---

## 10. Layout

**Sidebar width:** 240px (desktop)  
**Content max-width:** 1280px  
**Page padding:** 24px horizontal, 32px vertical  
**Card padding:** 16px  
**Table row height:** 48px  

**Grid:** 12-column, 24px gutter  
**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px–1024px
- Desktop: > 1024px

---

## 11. Component Decisions

| Component | Decision |
|---|---|
| Buttons | Solid primary for main CTA, ghost for secondary, destructive for cancel/delete |
| Inputs | Surface Overlay bg, Border border, Border Strong on focus, Primary ring |
| Tables | Surface bg, Surface Overlay on row hover, Border between rows |
| Modals | Surface bg, shadow-modal, radius-lg, 480px max-width |
| Badges | radius-sm, status colors from §9 |
| Sidebar | Surface bg, shadow-card on right edge, active item Primary Subtle bg + Primary text |
| Empty states | Centered, Text Secondary, action button below |
| Error states | Danger Subtle bg, Danger text, specific error message — never "something went wrong" |

---

## 12. What's not in V1

- Dark mode activation (tokens defined, not wired)
- Animation tokens
- Mobile-specific component variants
- Custom illustration system