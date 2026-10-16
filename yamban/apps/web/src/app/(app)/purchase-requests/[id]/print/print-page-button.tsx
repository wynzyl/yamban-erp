'use client';

export function PrintPageButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-control bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90"
    >
      Print
    </button>
  );
}
