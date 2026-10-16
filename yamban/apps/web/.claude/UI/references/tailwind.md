# Tailwind mapping
Import `tokens.css` once in `resources/css/app.css`. Tailwind holds names, never values.

```js
// tailwind.config.js
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: { extend: {
    colors: {
      background: 'var(--background)', foreground: 'var(--foreground)', card: 'var(--card)',
      muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
      border: 'var(--border)', ring: 'var(--ring)',
      primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
      partial: { DEFAULT: 'var(--partial)', foreground: 'var(--partial-foreground)', text: 'var(--partial-text)' },
      success: { DEFAULT: 'var(--success)', foreground: 'var(--success-foreground)' },
      destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' },
      // brand-magenta deliberately omitted
    },
    borderRadius: { control: 'var(--radius-control)', surface: 'var(--radius-surface)' },
    fontFamily: { display: 'var(--font-display)', sans: 'var(--font-body)' },
  } },
}
```

| Need | Class |
|---|---|
| Primary button | `bg-primary text-primary-foreground rounded-control` |
| Link / current production stage | `text-primary` |
| Balance-open chip | `bg-partial text-partial-foreground` |
| Balance amount as text | `text-partial-text yb-money` (never `text-partial`: 1.53:1 in light) |
| Paid chip | `bg-success text-success-foreground` |
| Overdue chip / negative net | `bg-destructive text-destructive-foreground` / `text-destructive yb-money` |
| Surface | `bg-card border border-border rounded-surface` (no shadow) |
| Secondary text | `text-muted-foreground` |

```php
// app/helpers.php
function money(float $v): string { return ($v < 0 ? '−' : '') . '₱' . number_format(abs($v), 2); }
function yards(float $v): string { return number_format($v, 2) . ' yd'; }
```
