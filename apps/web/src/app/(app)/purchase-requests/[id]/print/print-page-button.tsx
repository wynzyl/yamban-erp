'use client';

export function PrintPageButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded bg-black px-6 py-2 text-white hover:bg-gray-800"
    >
      Print
    </button>
  );
}
