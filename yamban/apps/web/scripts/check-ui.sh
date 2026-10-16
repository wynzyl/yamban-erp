#!/usr/bin/env bash
# Guideline "Checks that can fail", translated to this Next.js app.
# Each check must print nothing. Exit code 1 if any check finds drift.
set -u
cd "$(dirname "$0")/.."
fail=0
check() {
  local name="$1"; shift
  local out
  out="$("$@" 2>/dev/null || true)"
  if [[ -n "$out" ]]; then
    echo "✗ $name"; echo "$out" | sed 's/^/    /'; fail=1
  else
    echo "✓ $name"
  fi
}

SRC=src
INC=(--include=*.tsx --include=*.ts --include=*.css)

# Palette drift: raw Tailwind colours instead of tokens.
check "no raw Tailwind palette colours" \
  grep -rnE "\b(bg|text|border|ring|fill|stroke|from|to|via)-(red|green|emerald|amber|yellow|blue|indigo|sky|pink|fuchsia|rose|purple|violet|orange|lime|teal|cyan|slate|gray|zinc|neutral|stone)-[0-9]{2,3}" "${INC[@]}" $SRC

# Raw hex outside the token file.
check "no hex colours outside globals.css" \
  bash -c "grep -rnE '#[0-9A-Fa-f]{6}\b' --include=*.tsx --include=*.ts --include=*.css $SRC | grep -v 'src/app/globals.css'"

# Magenta outside the allowlist (logo, receipt, job ticket).
check "magenta only in allowlisted files" \
  bash -c "grep -rn 'yb-mark\|brand-magenta' --include=*.tsx --include=*.ts $SRC | grep -vE 'brand-mark|receipt|job-ticket'"

# Wrong currency: \$, PHP or P before an amount.
check "pesos only as ₱ via formatMoney()" \
  grep -rnE "(PHP ?[0-9]|[^\\\$\`{]\\\$[0-9]|>P ?[0-9])" --include=*.tsx $SRC

# Money in the display face (Barlow has no ₱ glyph) or monospace.
check "no font-display or font-mono on money" \
  grep -rnE "(font-display|font-mono)[^\"']*yb-money|yb-money[^\"']*(font-display|font-mono)" --include=*.tsx $SRC

# Per-element dark: colour overrides (tokens switch automatically).
check "no dark: colour overrides" \
  grep -rnE "dark:(bg|text|border)-" --include=*.tsx $SRC

# Shadowed KPI-card kit.
check "no shadow-lg / gradient surfaces" \
  grep -rnE "shadow-(md|lg|xl|2xl)|bg-gradient-|bg-linear-" --include=*.tsx $SRC

exit $fail
