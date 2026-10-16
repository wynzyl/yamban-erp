/** Allowlisted for magenta (scripts/check-ui.sh). The mark is a magenta Y in Barlow Condensed. */
export function BrandMark({ withName = true }: { withName?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span aria-hidden className="yb-mark font-display text-3xl font-bold leading-none">
        Y
      </span>
      {withName && <span className="font-display text-2xl font-semibold leading-none">Yamban</span>}
    </span>
  );
}
