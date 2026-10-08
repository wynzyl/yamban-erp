import type { Metadata } from 'next';
import { BrandMark } from '@/components/brand-mark';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Left panel - brand and context */}
      <div className="hidden flex-col justify-between bg-muted p-10 lg:flex">
        <BrandMark />

        <div className="space-y-6">
          <h2 className="font-display text-[40px] font-semibold leading-[1.1] tracking-tight">
            Every yard and every peso, accounted for.
          </h2>
          <p className="max-w-md text-muted-foreground">
            Orders, inventory, collections and expenses for the shop. Sign in to continue.
          </p>
        </div>

        {/* Tape gauge decoration - references the measuring tape motif */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-3 flex-1 rounded-full bg-partial" aria-hidden />
            <span className="text-sm text-muted-foreground">78 yd roll</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Track fabric by the yard. Know what you have before you cut.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <main className="flex flex-col justify-center px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <BrandMark />
          </div>

          <h1 className="mt-10 font-display text-[32px] font-semibold leading-tight lg:mt-0">
            Sign in
          </h1>
          <p className="mt-2 text-muted-foreground lg:hidden">
            Every yard and every peso, accounted for.
          </p>

          <LoginForm next={safeNext} />

          <p className="mt-8 text-sm text-muted-foreground">
            No account? Ask the shop owner to add you.
          </p>
        </div>
      </main>
    </div>
  );
}
