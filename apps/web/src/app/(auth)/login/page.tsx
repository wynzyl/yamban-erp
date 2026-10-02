import type { Metadata } from 'next';
import { BrandMark } from '@/components/brand-mark';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Only same-site paths; never an absolute or protocol-relative URL.
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <BrandMark />
      <h1 className="mt-10 font-display text-[32px] font-semibold leading-tight">Sign in</h1>
      <p className="mt-2 text-muted-foreground">Every yard and every peso, accounted for.</p>
      <LoginForm next={safeNext} />
      <p className="mt-8 text-sm text-muted-foreground">No account? Ask the shop owner to add you.</p>
    </main>
  );
}
