# Components

## Tape gauge (signature)
Fabric roll remaining. Full-width yellow (`partial`) scale with yard ticks (minor every 1 yd, major every 6 yd, labels every 12 yd at exact positions `n/rollLength`). Used portion overlaid in `muted` with diagonal hatching, clipped by `--used`, with its own ticks in `muted-foreground`. A 3px `foreground` edge marks the cut point. Legend: roll id and fabric left; right side "<yards> left. Enough for N <size> <garment> at <yd> each." Must have `role="img"` and an aria-label stating used/remaining.

## Payment tape
14px bar on `muted`. Fill `partial` while a balance is open, `success` when paid. Legend left: payment kind, amount, method. Right: "Balance ₱…" in `text-partial-text`, or "Paid".

## Order row
Columns in order: Order no, Customer, Balance (right, heaviest, 17px/600), Total (right), Payment chip. Balance colour: `partial-text` if open, `destructive` if overdue, `foreground` if zero.

## Status chip
13px/600, 4px radius. Text states the fact: "Balance ₱12,500.00", "Overdue 14 days", "Paid", "Unpaid" (outline). Never "Partial", never an emoji.

## Size run
Fixed columns XS S M L XL 2XL 3XL. Size label 13px Plex Sans muted; count in Barlow Condensed 700 34px. Below: total fabric to cut via `yards()`.

## Order cost
Horizontal stack: fabric `foreground`, ink `primary`, electricity `muted-foreground`, labour `border`. Never payment/stock colours. Legend shows cost against price via `money()`.

## Ledger (month view)
Two halves, Debit (collections) and Credit (expenses), each with date, particulars, amount, category. Monthly NET at top; negative NET in `destructive`. Category gap must display ₱0.00; non-zero is a defect.
