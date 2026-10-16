import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="font-display text-[32px] font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">The address may be mistyped, or the record was removed.</p>
      <Link href="/" className="mt-6 inline-block text-primary hover:underline">
        Go to the dashboard
      </Link>
    </main>
  );
}
