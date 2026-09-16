import type { ReactNode } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { Link } from "wouter";
import BrandMark from "@/components/BrandMark";
import { CHMSU_BRAND } from "@/config/brand";

export default function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  alternate,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  alternate: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white text-[#16352a] selection:bg-[#f2d313] selection:text-[#16352a]">
      <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[#07563f] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
          <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full border border-[#f2d313]/30" />
          <div className="absolute -bottom-44 -left-28 h-[34rem] w-[34rem] rounded-full border border-white/15" />
          <div className="relative z-10 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.22em]">
            <span className="grid size-9 place-items-center rounded-full bg-[#f2d313] text-[#07563f]">
              <ArrowUpRight className="size-5" />
            </span>
            <span>Applicant portal</span>
          </div>

          <div className="relative z-10 max-w-xl pb-8">
            <p className="mb-6 text-sm font-medium uppercase tracking-[0.22em] text-[#f2d313]">{CHMSU_BRAND.tagline}</p>
            <h2 className="max-w-lg font-serif text-5xl leading-[0.98] tracking-[-0.04em] xl:text-6xl">
              Start where your future gets a little more real.
            </h2>
            <p className="mt-7 max-w-md text-base leading-7 text-white/80">
              Keep your application journey in one calm, secure place. Your account is ready when you are.
            </p>
            <div className="mt-10 grid gap-3 text-sm text-white/90">
              {[
                "One account for your admission journey",
                "Your contact details stay with your profile",
                "A secure session every time you sign in",
              ].map(item => (
                <div className="flex items-center gap-3" key={item}>
                  <span className="grid size-6 place-items-center rounded-full bg-white/15 text-[#f2d313]">
                    <Check className="size-3.5" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs uppercase tracking-[0.18em] text-white/65">{CHMSU_BRAND.name}</p>
        </section>

        <section className="flex min-h-screen flex-col bg-white px-5 py-7 sm:px-10 sm:py-10 lg:px-16 xl:px-24">
          <header className="flex items-center justify-between">
            <Link href="/login" className="text-[#16352a]"><BrandMark compact /></Link>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#087f5b]">Applicant access</div>
          </header>

          <div className="flex flex-1 items-center justify-center py-14">
            <div className="w-full max-w-[470px]">
              <div className="mb-8">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#087f5b]">{eyebrow}</p>
                <h1 className="font-serif text-4xl leading-tight tracking-[-0.035em] text-[#07563f] sm:text-5xl">{title}</h1>
                <p className="mt-4 max-w-md text-sm leading-6 text-[#65747a]">{description}</p>
              </div>
              {children}
              <div className="mt-8 border-t border-[#dce2dc] pt-6 text-center text-sm text-[#718087]">{alternate}</div>
            </div>
          </div>

          <footer className="flex items-center justify-between text-xs text-[#8b9798]">
            <span>© 2026 {CHMSU_BRAND.shortName}</span>
            <span>{CHMSU_BRAND.tagline}</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
