import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { tmdbImage } from "@/lib/tmdb-image";
import { focusRing } from "@/components/editorial";
import { getI18n } from "@/lib/i18n/server";
import LanguageSwitch from "@/components/language-switch";

/** โครงหน้าเข้าสู่ระบบ / สมัครสมาชิก: กำแพงใบหน้าฝั่งซ้าย ฟอร์ม (children) ฝั่งขวา */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getI18n();

  // กำแพงใบหน้า (ย่อจากหน้าแรก) เป็นฉากหลังฝั่งซ้าย
  const faces = await prisma.actors.findMany({
    where: { avatar_url: { not: null } },
    orderBy: [{ awards_count: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    take: 48,
    select: { id: true, avatar_url: true },
  });

  return (
    <main className="relative grid min-h-screen bg-ink lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* โลโก้ + กลับหน้าแรก */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-6 sm:px-10 sm:pt-8">
        <Link href="/" className={`rounded-sm ${focusRing}`} aria-label={t.nav.logoLabel}>
          <span className="font-editorial text-2xl italic text-gold-light">Hollywood Hub</span>
        </Link>
        <div className="flex items-center gap-5">
          <LanguageSwitch />
          <Link
            href="/"
            className={`inline-flex items-center gap-2 rounded-sm text-sm text-cream/75 transition-colors hover:text-gold-light ${focusRing}`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t.login.backHome}
          </Link>
        </div>
      </header>

      {/* ═══════ ฝั่งซ้าย: กำแพงใบหน้า + หัวข้อ ═══════ */}
      <section className="relative isolate flex min-h-[46vh] items-end overflow-hidden px-6 pb-12 pt-28 sm:px-10 lg:min-h-screen lg:pb-16">
        <ul aria-hidden className="absolute inset-0 -z-10 grid grid-cols-6 content-start sm:grid-cols-8">
          {faces.map((f) => (
            <li key={f.id} className="aspect-square overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tmdbImage(f.avatar_url, "w185") ?? undefined}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover object-top opacity-30 grayscale"
              />
            </li>
          ))}
        </ul>
        {/* มืดลงด้านล่างและจางไปทางฝั่งฟอร์ม */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/75 to-ink/30" />
        <div aria-hidden className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-transparent via-transparent to-ink lg:block" />

        <div className="max-w-xl">
          <h2 className="font-editorial text-[clamp(1.5rem,7.2vw,3rem)] leading-[1.25] text-cream lg:text-[clamp(2.25rem,3.3vw,3.5rem)]">
            {/* ไทยไม่มีช่องว่างระหว่างคำ — ห้ามตัดกลางบรรทัด (ไม่งั้น "ฮอลลีวูด" ถูกตัดกลางคำ) ขนาดตัวอักษรปรับตามจอแทน */}
            <span className="block">{t.login.headline1}</span>
            <span className={`block text-cream/85 ${locale === "th" ? "whitespace-nowrap" : ""}`}>{t.login.headline2}</span>
          </h2>
          <span aria-hidden className="mt-6 block h-px w-14 bg-gold" />
          <p className="mt-6 max-w-md leading-relaxed text-cream/75">
            {t.login.intro}
          </p>

          {/* ค้นหาได้จริง (ไม่ต้องเข้าสู่ระบบ) */}
          <form action="/search" method="get" role="search" className="relative mt-8 hidden max-w-md sm:block">
            <label htmlFor="login-search" className="sr-only">
              {t.login.searchLabel}
            </label>
            <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-light" aria-hidden />
            <input
              id="login-search"
              name="q"
              type="search"
              placeholder={t.login.searchPlaceholder}
              className="h-12 w-full border-0 border-b border-gold-dark bg-transparent pl-7 pr-1 text-cream placeholder:text-muted focus:border-gold focus:outline-none"
            />
          </form>
        </div>
      </section>

      {/* ═══════ ฝั่งขวา: ฟอร์ม ═══════ */}
      <section className="flex flex-col justify-center px-6 py-14 sm:px-10 lg:min-h-screen lg:border-l lg:border-line lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">{children}</div>
        <footer className="mx-auto mt-14 w-full max-w-md text-xs text-muted">
          © {new Date().getFullYear()} Hollywood Stars &amp; Filmography Hub
        </footer>
      </section>
    </main>
  );
}
