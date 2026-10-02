---
name: yamban-design-system
description: Brand and interface rules for the Yamban Shop System (Laravel sales, inventory, income/expense and order system for a sublimation and tailoring shop). Use EVERY time a Yamban screen, Blade view, component, receipt, job ticket, email or report is created, changed, reviewed or prototyped, including "quick" UI work and copy shown in the app. If it touches how Yamban looks, counts money or yards, or speaks, this skill governs it.
---

Trigger: `UI` or `UI` or `ui` or `design system` or `yamban design system`

# Yamban design system

The product is different because it measures cloth in yards against rolls, costs every order (fabric, ink, electricity, labour), leads with the balance owed, and keeps the shop's own debit/credit ledger. Every rule below protects one of those four things.

## Before writing UI
1. Read `references/tokens.css`. Colours, radii and fonts come only from it.
2. Read `references/components.md` for the component you are touching.
3. Read `references/voice.md` before writing any user-facing string.

## Hard rules
- Colour comes from tokens via Tailwind names in `references/tailwind.md`. No raw Tailwind palette colours, no hex outside `tokens.css`.
- Four payment tiers only: unpaid (outline), down payment / balance open (`partial`), paid (`success`), overdue (`destructive`). Production stages are neutral; the current one is `primary`.
- Expenses are `text-foreground`. Red is only for negative net, overdue and out of stock.
- Money: `money()` helper + `.yb-money`. `₱`, comma thousands, two decimals, true minus `−` before `₱`.
- Never set money in `font-display` (Barlow Condensed has no ₱ glyph). Never `font-mono` on amounts.
- Fabric quantities always carry `yd`, two decimals. Rolls render as the tape gauge.
- Order views show Balance before Total, and Balance is the heaviest figure.
- An expense cannot be saved without a category.
- Magenta (`--brand-magenta`) only via `.yb-mark`, only in logo, receipt header and printed job ticket files. It has no Tailwind utility on purpose; do not add one.
- No per-element `dark:` colour overrides. Tokens handle the theme.
- No gradients, no `shadow-lg`/`shadow-xl` on content surfaces, no emoji in statuses or totals, no user-defined status colours.
- Customer names render exactly as entered (no `ucwords`, no `Str::title`).

## Checklist (each item must pass; run before finishing)
```bash
# 1. raw Tailwind palette colours in views -> must print nothing
grep -rnE "(bg|text|border|ring|fill|stroke)-(red|green|amber|yellow|blue|indigo|violet|purple|pink|fuchsia|rose|emerald|teal|sky|slate|gray|zinc)-[0-9]{2,3}" resources/views
# 2. hex outside the token file -> nothing
grep -rnE "#[0-9A-Fa-f]{3,8}\b" resources/views resources/css | grep -v tokens.css
# 3. magenta outside allowlist -> nothing
grep -rnE "yb-mark|brand-magenta" resources/ | grep -vE "logo|receipt|job-ticket|tokens.css"
# 4. wrong currency -> nothing
grep -rnE "PHP ?[0-9]|\\\$ ?[0-9]|>P ?[0-9]" resources/views
# 5. money in display or mono font -> nothing
grep -rnE "(font-display|font-mono)[^\"]*(yb-money|money\()|(yb-money|money\()[^\"]*(font-display|font-mono)" resources/views
# 6. dark: colour overrides in components -> nothing
grep -rnE "dark:(bg|text|border)-" resources/views/components
# 7. title-casing customer names -> nothing
grep -rnE "(ucwords|Str::title)\(\\\$[a-z]*(customer|name)" app resources
# 8. contrast gate -> must end "ALL PASS", exit 0
python3 scripts/contrast.py check scripts/tokens.json
```
If a token changes, update `scripts/tokens.json` too and rerun 8. If a check fails because a legitimate state has no token, add the token (with both themes and a measured pair) instead of improvising a colour.
