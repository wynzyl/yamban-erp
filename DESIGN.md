# Yamban ERP Design System

> Semantic design specification for AI-agent screen generation (Google Stitch compatible)

## Project Identity

**Product:** Yamban Shop System — ERP for a sublimation and tailoring shop
**Domain:** Manufacturing, inventory, collections, expenses
**Tech Stack:** Next.js 16 + Tailwind CSS v4 + shadcn/ui
**Mood:** Factory floor pragmatism meets clean digital ledger

---

## Design Density & Motion

| Attribute | Value | Rationale |
|-----------|-------|-----------|
| Density | 7/10 | Dashboard-dense, not cockpit. Information-rich but breathable. |
| Variance | 3/10 | Predictable, functional layouts. Users scan, not explore. |
| Motion | 2/10 | Static manufacturing software. No perpetual animations. |

**Motion philosophy:** Focus indicators only. Skeleton loaders for async content. No spring physics, no staggered reveals, no decorative transitions.

---

## Color System

### Light Theme (Default)

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Canvas | `--background` | `#F3F5F6` | Page background — the fabric before printing |
| Surface | `--card` | `#FFFFFF` | Cards, modals, dropdowns |
| Muted Background | `--muted` | `#E6EAEC` | Table headers, subtle containers, cutting table grey |
| Border | `--border` | `#CBD3D7` | All structural lines — always 1px |
| Text Primary | `--foreground` | `#15191B` | Headlines, amounts, labels — press ink |
| Text Secondary | `--muted-foreground` | `#535C62` | Descriptions, metadata, timestamps |
| Accent Primary | `--primary` | `#0A5C7A` | CTAs, links, focus rings — sublimation cyan |
| Accent Primary Text | `--primary-foreground` | `#FFFFFF` | Text on primary buttons |
| Semantic Yellow | `--partial` | `#F2C230` | Partial payment badges — tailor's tape |
| Semantic Yellow Text | `--partial-text` | `#7A5800` | Balance due amounts in light mode |
| Semantic Green | `--success` | `#1E6B3A` | Fully paid, healthy inventory — ledger green |
| Semantic Red | `--destructive` | `#B3261E` | Overdue, out of stock, negative net — red chalk |
| Brand Magenta | `--brand-magenta` | `#B0125B` | **RESTRICTED:** Logo, receipts, job tickets ONLY |

### Dark Theme

| Role | Token | Hex |
|------|-------|-----|
| Canvas | `--background` | `#101517` |
| Surface | `--card` | `#182024` |
| Muted Background | `--muted` | `#212A2F` |
| Border | `--border` | `#33414A` |
| Text Primary | `--foreground` | `#E8EDEF` |
| Text Secondary | `--muted-foreground` | `#9CA8AF` |
| Accent Primary | `--primary` | `#5BBAD6` |
| Semantic Yellow | `--partial` | `#E8B931` |
| Semantic Green | `--success` | `#5CBF7E` |
| Semantic Red | `--destructive` | `#F2776C` |
| Brand Magenta | `--brand-magenta` | `#E05596` |

---

## Typography

### Font Stack

| Role | Family | Fallbacks |
|------|--------|-----------|
| Display | Barlow Condensed | Arial Narrow, sans-serif-condensed, sans-serif |
| Body | IBM Plex Sans | Segoe UI, Roboto, sans-serif |
| Mono | JetBrains Mono | Consolas, monospace |

### Scale

| Element | Font | Size | Weight | Notes |
|---------|------|------|--------|-------|
| Page Title | Barlow Condensed | 32px | 600 | `tracking-tight` |
| Section Title | Barlow Condensed | 22px | 600 | `tracking-tight` |
| Order Number | Barlow Condensed | 15px | 600 | Prominent identifiers |
| Body Text | IBM Plex Sans | 14–16px | 400 | `leading-relaxed`, max 65ch |
| Labels | IBM Plex Sans | 14px | 500 | Form labels, table headers |
| Caption | IBM Plex Sans | 12px | 400 | Timestamps, metadata |

### Money Class (`.yb-money`)

```css
.yb-money {
  font-family: var(--font-body); /* IBM Plex Sans — never Barlow */
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  white-space: nowrap;
}
```

**Format:** `₱33,600.00` with true minus `−₱` for negatives
**CRITICAL:** Never use Barlow on money amounts — it lacks the ₱ glyph

---

## Spacing & Layout

### Container Widths

| Context | Max Width | Class |
|---------|-----------|-------|
| Dashboard views | 1152px | `max-w-6xl` |
| Full data tables | 1280px | `max-w-7xl` |
| Forms / dialogs | 640px | `max-w-xl` |

### Grid System

- Use CSS Grid for dashboards
- Responsive collapse at 768px breakpoint
- KPI cards: 3–4 column grids
- Gap: `gap-4` (16px) standard, `gap-6` (24px) for section separation

### Border Radius

| Element | Token | Value |
|---------|-------|-------|
| Buttons, inputs | `--radius-control` | 6px |
| Cards, surfaces | `--radius-surface` | 10px |

---

## Component Specifications

### Buttons

- Flat fill, no outer glow or shadow
- `-1px` Y translate on `:active`
- Border radius: 6px (`rounded-control`)
- Primary: `bg-primary text-primary-foreground`
- Destructive: `bg-destructive text-destructive-foreground`
- Outline: `border border-border bg-transparent`

### Surfaces (Cards)

- Border-only elevation: `border border-border`
- No `box-shadow` on content cards
- Background: `bg-card`
- Border radius: 10px (`rounded-surface`)

### Form Inputs

- Label positioned above input
- Error message below input
- Focus ring: `ring-2 ring-primary ring-offset-2`
- Border: `border-border`, focus: `border-primary`

### Badges (Payment Status)

| Status | Style |
|--------|-------|
| Unpaid | Outline only (`border border-border`) |
| Partial | Yellow fill (`bg-partial text-partial-foreground`) |
| Paid | Green fill (`bg-success text-success-foreground`) |
| Overdue | Red fill (`bg-destructive text-destructive-foreground`) |

### Tables

- Sticky headers with `bg-muted`
- Row hover: subtle background shift
- Right-align all numeric columns
- Use `tabular-nums` for number columns
- Borders: horizontal only (`border-b border-border`)

---

## Semantic Color Rules

### Payment Status Tiers

1. **Unpaid** — Outline badge, neutral
2. **Partial** — Yellow badge, shows balance due
3. **Paid** — Green badge
4. **Overdue** — Red badge, shows age

### Color Meaning Restrictions

| Color | Allowed Usage | Forbidden Usage |
|-------|---------------|-----------------|
| Yellow (`--partial`) | Partial payment, low stock warnings | Generic warnings |
| Green (`--success`) | Fully paid, healthy inventory | Generic success |
| Red (`--destructive`) | Overdue, out of stock, negative net | Regular expenses, production stages |
| Magenta (`--brand-magenta`) | Logo mark, receipts, job tickets | UI elements, buttons, badges |

**Important:** Expenses are NOT red. Only negative net amounts use red.

---

## Content Guidelines

### Copy Style

- Sentence case everywhere
- Short, specific copy in the shop's vocabulary
- Use: collections, expenses, down payment, bale, yards
- Avoid: generic business terms, formal language

### Number Formatting

| Type | Format | Example |
|------|--------|---------|
| Money | `formatMoney()` | `₱33,600.00` |
| Negative money | True minus | `−₱1,200.00` |
| Fabric length | With unit | `1.50 yd` |
| Roll stock | Fraction format | `26.00 of 78 yd` |

### Display Rules

- Balance shown before total on order views
- Balance is always the largest figure
- Customer names: display exactly as entered (no title-casing)
- Order numbers: prominent, Barlow Condensed

---

## Anti-Patterns (Strictly Banned)

### Colors
- [ ] No raw Tailwind palette colors (`bg-red-500`, `text-blue-400`)
- [ ] No hex colors outside `globals.css` / `tokens.css`
- [ ] No per-element `dark:` color overrides
- [ ] No pure black (`#000000`)

### Surfaces
- [ ] No shadows (`shadow-lg`, `shadow-xl`) on content
- [ ] No gradients on surfaces
- [ ] No gradient KPI cards

### Typography
- [ ] No Barlow font on money amounts
- [ ] No Inter font
- [ ] No title-casing customer names

### Semantics
- [ ] No emoji in statuses or copy
- [ ] No magenta outside logo/receipts/tickets
- [ ] No expenses displayed in red
- [ ] No generic AI copy ("Elevate", "Seamless", "Unleash", "Streamline")

### Layout
- [ ] No perpetual animations
- [ ] No spring physics or staggered reveals

---

## Verification Checklist

Before committing any UI work:

1. Run `npm run check:ui` in `apps/web` — must pass
2. Verify all colors use token utilities only
3. Confirm money amounts use `.yb-money` class and IBM Plex Sans
4. Check payment badges follow the four-tier system
5. Ensure no shadows on content cards

---

## Token Reference

All design tokens are defined in:
```
apps/web/docs/UI/references/tokens.css
```

Import via:
```css
@import './tokens.css';
```

---

*This document is the single source of truth for Yamban visual design. When in conflict with component libraries, this specification takes precedence.*
