import Link from "next/link";
import { getHomeData } from "@/lib/home-data";
import { getI18n } from "@/lib/i18n/server";
import { Face, SectionHead, focusRing, goldLink } from "@/components/editorial";
import { tmdbImage } from "@/lib/tmdb-image";
import Navbar from "@/components/navbar";
import SiteFooter from "@/components/site-footer";
import FavoriteButton from "@/components/favorite-button";
import RowScroller from "@/components/row-scroller";
import { MovieCard } from "@/components/movie-card";
import { AwardRankRow } from "@/components/award-rank-row";

// ดึงข้อมูลสดจาก MySQL ทุกครั้ง (ดาราประจำสัปดาห์/ปฏิทินวันเกิดขึ้นกับวันที่)
export const dynamic = "force-dynamic";


/* ───────────────────────── หน้าแรก ───────────────────────── */

export default async function HomePage() {
  const [d, { t, locale }] = await Promise.all([getHomeData(), getI18n()]);
  // ภาษาไทยไม่มีช่องว่างระหว่างคำ จึงห้ามตัดบรรทัดกลางหัวข้อ ส่วนภาษาอังกฤษตัดตามคำได้ปกติ
  const keepLine = locale === "th" ? "whitespace-nowrap" : "";

  return (
    <>
      <Navbar overlay />

      <main>
        {/* ═══════ กำแพงใบหน้า + ค้นหาดารา ═══════ */}
        <section aria-labelledby="home-title" className="relative isolate flex min-h-[92svh] items-center overflow-hidden lg:min-h-[min(100vh,960px)]">
          {/*
            ใบหน้าดาราทุกคน คนละ 1 ช่อง (ไม่วนซ้ำ): ขาวดำจาง ๆ ชี้แล้วเป็นสีพร้อมชื่อ
            จำนวนคอลัมน์ตั้งให้ช่องใหญ่พอที่ ~94 ใบหน้าเต็มจอ ส่วนที่เหลือท้ายกำแพงจมไปกับ gradient ด้านล่าง
            prefetch={false}: ลิงก์ทั้งหมดอยู่ในจอพร้อมกัน — ถ้า prefetch จะยิงคำขอหน้าดาราเกือบร้อยครั้งตอนเปิดหน้า
            ยึดแค่ด้านบน (ไม่ใช่ inset-0): ถ้าล็อกความสูงกริด แถวจะถูกบีบให้พอดี section แต่ช่องยังเป็นสี่เหลี่ยมจัตุรัส
            ใบหน้าเลยซ้อนกันบนจอกว้าง ๆ — ปล่อยให้กริดสูงตามแถวแล้วให้ section (overflow-hidden) ตัดส่วนเกินแทน
          */}
          <ul aria-hidden className="absolute inset-x-0 top-0 -z-10 grid grid-cols-6 content-start sm:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
            {d.wall.map((a, i) => (
              <li key={a.id} className="group relative aspect-square overflow-hidden">
                <Link href={`/actors/${a.id}`} prefetch={false} tabIndex={-1} className="block h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tmdbImage(a.avatar_url, "w185") ?? undefined}
                    alt=""
                    loading={i < 60 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full object-cover object-top opacity-35 grayscale transition duration-500 ease-premium group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 motion-reduce:transition-none"
                  />
                  <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-transparent transition group-hover:ring-gold" />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-ink/85 px-1.5 py-1 text-center text-[11px] leading-tight text-gold-light transition-transform duration-300 group-hover:translate-y-0">
                    {a.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {/* มืดตรงกลางให้อ่านตัวอักษร (ไม่รับเมาส์ — ชี้ใบหน้ารอบ ๆ ได้) */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_60%_at_50%_52%,rgba(10,10,10,0.96)_0%,rgba(10,10,10,0.82)_45%,rgba(10,10,10,0.15)_100%)]" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-ink via-ink/80 to-transparent" />

          {/* กล่องเนื้อหาไม่รับเมาส์ (ชี้ใบหน้าที่อยู่รอบ ๆ ได้) — รับเฉพาะตัวอักษร ฟอร์ม และลิงก์ */}
          <div className="pointer-events-none mx-auto w-full max-w-3xl px-4 pb-16 pt-28 text-center sm:px-6 [&_form]:pointer-events-auto [&_h1]:pointer-events-auto [&_nav]:pointer-events-auto [&_p]:pointer-events-auto">
            <h1 id="home-title" className="font-editorial text-[clamp(1.6rem,8.2vw,3.75rem)] leading-[1.25] text-cream sm:leading-[1.2]">
              {/* ภาษาไทยไม่มีช่องว่างระหว่างคำ — กำหนดจุดขึ้นบรรทัดเองไม่ให้คำตกบรรทัดเดี่ยว ๆ */}
              <span className={`block ${keepLine}`}>{t.home.title1}</span>
              <span className={`block ${keepLine}`}>{t.home.title2}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-cream/75 sm:text-lg">
              <span className="sm:block">
                {t.common.statsIntro(d.stats.actors, d.stats.nationalities)}
              </span>
              <span className="sm:block"> {t.home.hint}</span>
            </p>

            <form action="/actors" method="get" role="search" className="mx-auto mt-9 flex max-w-xl items-end gap-3">
              <label htmlFor="home-q" className="sr-only">
                {t.home.searchLabel}
              </label>
              <input
                id="home-q"
                name="q"
                type="search"
                placeholder={t.home.searchPlaceholder}
                className="h-14 min-w-0 flex-1 border-0 border-b border-gold-dark bg-transparent px-1 text-lg text-cream placeholder:text-muted focus:border-gold focus:outline-none sm:text-xl"
              />
              <button type="submit" className={`h-12 shrink-0 rounded-[4px] bg-gold-gradient px-5 font-medium text-ink sm:px-6 ${focusRing}`}>
                {t.common.search}
              </button>
            </form>

            <nav aria-label={t.home.shortcuts} className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm">
              <a href="#featured" className={goldLink}>
                {t.home.featured}
              </a>
              <a href="#ranking" className={goldLink}>
                {t.home.ranking}
              </a>
              <a href="#directory" className={goldLink}>
                {t.home.directoryShort}
              </a>
            </nav>
          </div>
        </section>

        <div className="mx-auto max-w-[1400px] space-y-24 px-4 pb-8 pt-10 sm:space-y-32 sm:px-6 lg:px-10">
          {/* ═══════ ดาราประจำสัปดาห์ (บทความ) ═══════ */}
          {d.featured && (
            <section id="featured" aria-labelledby="featured-title" className="scroll-mt-24">
              <SectionHead id="featured-title" title={t.home.featured} description={t.home.featuredDesc} />
              <article className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
                <div className="lg:col-span-5">
                  <div className="relative mx-auto max-w-md lg:max-w-none">
                    {/* กรอบทองเยื้องหลังภาพ */}
                    <span aria-hidden className="absolute -bottom-3 -right-3 left-3 top-3 border border-gold-dark" />
                    <div className="relative aspect-[4/5] overflow-hidden bg-surface">
                      {d.featured.avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={tmdbImage(d.featured.avatar_url, "w500") ?? undefined}
                          alt={t.common.photoOf(d.featured.name)}
                          className="h-full w-full object-cover object-top"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 lg:col-span-7 lg:pt-4">
                  <h3 className="font-editorial text-5xl italic leading-[1.05] text-cream sm:text-7xl">{d.featured.name}</h3>
                  <p className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-cream/80">
                    <span>{d.featured.nationality ?? t.common.noNationality}</span>
                    {d.featured.age !== null && <span>{t.common.age(d.featured.age)}</span>}
                    <span className="text-gold-light">{t.common.awards(d.featured.awards)}</span>
                    <span>{t.common.moviesInSystem(d.featured.movieCount)}</span>
                  </p>

                  {d.featured.lead && (
                    <p lang="en" className="mt-7 max-w-[62ch] font-editorial text-lg leading-[1.75] text-cream/85">
                      {d.featured.lead}
                    </p>
                  )}

                  {d.featured.credits.length > 0 && (
                    <div className="mt-9">
                      <h4 className="text-sm text-muted">{t.home.creditsInSystem}</h4>
                      <ul className="mt-3 divide-y divide-line border-y border-line">
                        {d.featured.credits.map((c) => (
                          <li key={c.id}>
                            <Link
                              href={`/movies/${c.id}`}
                              className={`grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 py-3 transition-colors hover:bg-surface sm:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,14rem)] ${focusRing}`}
                            >
                              <span className="font-editorial text-gold-light tabular-nums">{c.year ?? "—"}</span>
                              <span className="truncate text-cream">{c.title}</span>
                              {c.role && <span className="col-start-2 truncate text-sm text-muted sm:col-start-auto">{t.common.asRole(c.role)}</span>}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-9 flex flex-wrap gap-3">
                    <Link
                      href={`/actors/${d.featured.id}`}
                      className={`inline-flex h-12 items-center rounded-[4px] bg-gold-gradient px-6 font-medium text-ink transition-shadow hover:glow-gold ${focusRing}`}
                    >
                      {t.home.readFullBio}
                    </Link>
                    <FavoriteButton
                      kind="actor"
                      variant="pill"
                      className="h-12"
                      item={{ id: d.featured.id, name: d.featured.name, avatar_url: d.featured.avatar_url, nationality: d.featured.nationality }}
                    />
                  </div>
                </div>
              </article>
            </section>
          )}

          {/* ═══════ ทำเนียบรางวัล (อันดับ = ลำดับจริง จึงใช้ตัวเลข) ═══════ */}
          {d.ranking.length > 0 && (
            <section id="ranking" aria-labelledby="ranking-title" className="scroll-mt-24">
              <SectionHead
                id="ranking-title"
                title={t.home.ranking}
                description={t.home.rankingDesc}
                action={
                  <Link href="/actors" className={goldLink}>
                    {t.actors.seeAll}
                  </Link>
                }
              />
              <p className="mt-3 text-sm text-muted">{t.home.rankingHint}</p>
              {/* 2 คอลัมน์แยกกัน (1–5 / 6–10) กางรายการรางวัลแล้วไม่ดันอีกคอลัมน์ */}
              <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-x-14 lg:grid-cols-2">
                {[d.ranking.slice(0, 5), d.ranking.slice(5)].map((col, c) => (
                  <ol key={c} start={c * 5 + 1}>
                    {col.map((a, i) => (
                      <AwardRankRow
                        key={a.id}
                        rank={c * 5 + i + 1}
                        actor={a}
                        awards={a.awardList.map((w) => ({
                          id: w.id,
                          year: w.year,
                          // ชื่อภาษาไทยมีเฉพาะบางรางวัล (Wikidata) ไม่มีจึงใช้ภาษาอังกฤษ
                          name: locale === "th" && w.name_th ? w.name_th : w.name_en.charAt(0).toUpperCase() + w.name_en.slice(1),
                          forWork: w.for_work,
                        }))}
                      />
                    ))}
                  </ol>
                ))}
              </div>
            </section>
          )}

          {/* ═══════ ปฏิทินวันเกิดดารา ═══════ */}
          <section id="birthdays" aria-labelledby="birthdays-title" className="scroll-mt-24">
            <SectionHead
              id="birthdays-title"
              title={t.home.birthdaysTitle(t.date.monthYear(new Date(Date.UTC(d.birthdays.year, d.birthdays.month, 1))))}
              description={t.home.birthdaysDesc(d.birthdays.total)}
            />

            {/* จอใหญ่: ปฏิทิน */}
            <div className="mt-8 hidden sm:block">
              <div className="grid grid-cols-7 border-l border-t border-line">
                {t.date.weekdays.map((w) => (
                  <div key={w} className="border-b border-r border-line px-3 py-2 text-xs text-muted">
                    {w}
                  </div>
                ))}
                {Array.from({ length: d.birthdays.leadingBlanks }, (_, i) => (
                  <div key={`blank-${i}`} aria-hidden className="border-b border-r border-line bg-surface/40" />
                ))}
                {d.birthdays.days.map((day) => (
                  <div key={day.day} className={`min-h-28 border-b border-r border-line p-2.5 ${day.actors.length ? "bg-surface" : ""}`}>
                    <span
                      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full font-editorial text-sm tabular-nums ${
                        day.isToday ? "bg-gold text-ink" : day.actors.length ? "text-gold-light" : "text-muted"
                      }`}
                    >
                      {day.day}
                      {day.isToday && <span className="sr-only"> {t.home.today}</span>}
                    </span>
                    {day.actors.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {day.actors.map((a) => (
                          <li key={a.id}>
                            <Link href={`/actors/${a.id}`} className={`group flex items-center gap-2 rounded-sm ${focusRing}`}>
                              <Face name={a.name} url={a.avatar_url} className="h-8 w-8" />
                              <span className="min-w-0">
                                <span className="block truncate text-xs text-cream group-hover:text-gold-light">{a.name}</span>
                                {a.turning !== null && <span className="block text-[11px] text-muted">{t.home.turning(a.turning)}</span>}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* มือถือ: รายการ (ช่องปฏิทินแคบเกินจะใส่ชื่อ) */}
            <ul className="mt-6 divide-y divide-line border-y border-line sm:hidden">
              {d.birthdays.days
                .filter((day) => day.actors.length)
                .flatMap((day) => day.actors.map((a) => ({ ...a, day: day.day, isToday: day.isToday })))
                .map((a) => (
                  <li key={a.id}>
                    <Link href={`/actors/${a.id}`} className={`flex items-center gap-4 py-3 ${focusRing}`}>
                      <span className={`w-8 text-center font-editorial text-lg tabular-nums ${a.isToday ? "text-gold" : "text-gold-light"}`}>{a.day}</span>
                      <Face name={a.name} url={a.avatar_url} className="h-10 w-10" />
                      <span className="min-w-0">
                        <span className="block truncate text-cream">{a.name}</span>
                        {a.turning !== null && <span className="text-xs text-muted">{t.home.turning(a.turning)}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>

          {/* ═══════ ร่วมจอบ่อยที่สุด ═══════ */}
          {d.pairs.length > 0 && (
            <section aria-labelledby="pairs-title">
              <SectionHead id="pairs-title" title={t.home.pairsTitle} description={t.home.pairsDesc} />
              <ul className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-x-14 lg:grid-cols-2">
                {d.pairs.map(({ a, b, movies }) => (
                  <li key={`${a.id}-${b.id}`} className="flex items-center gap-5 border-b border-line py-5">
                    <span aria-hidden className="flex shrink-0 -space-x-4">
                      <Face name={a.name} url={a.avatar_url} className="h-16 w-16" />
                      <Face name={b.name} url={b.avatar_url} className="h-16 w-16" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg leading-snug text-cream">
                        <Link href={`/actors/${a.id}`} className={`rounded-sm hover:text-gold-light ${focusRing}`}>
                          {a.name}
                        </Link>
                        <span className="text-muted">{t.home.with}</span>
                        <Link href={`/actors/${b.id}`} className={`rounded-sm hover:text-gold-light ${focusRing}`}>
                          {b.name}
                        </Link>
                      </p>
                      <p className="mt-1 truncate text-sm text-muted">
                        {movies.slice(0, 3).map((m, i) => (
                          <span key={m.id}>
                            {i > 0 && ", "}
                            <Link href={`/movies/${m.id}`} className={`rounded-sm hover:text-cream ${focusRing}`}>
                              {m.title}
                            </Link>
                          </span>
                        ))}
                      </p>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block font-editorial text-3xl leading-none text-gold-light tabular-nums">{movies.length}</span>
                      <span className="text-xs text-muted">{t.common.filmsUnit}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ═══════ ผลงานล่าสุดของดารา (หนังเป็นบริบท) ═══════ */}
          {d.latest.length > 0 && (
            <section aria-labelledby="latest-title">
              <SectionHead
                id="latest-title"
                title={t.home.latestTitle}
                description={t.home.latestDesc}
                action={
                  <Link href="/movies?sort=new" className={goldLink}>
                    {t.home.allMoviesLink}
                  </Link>
                }
              />
              <div className="-mx-4 mt-6 sm:-mx-6 lg:-mx-10">
                <RowScroller label={t.home.latestTitle}>
                  {d.latest.map((movie) => (
                    <li key={movie.id} className="w-[38vw] max-w-44 shrink-0 snap-start sm:w-44">
                      <MovieCard movie={movie} actorNames={movie.cast.map((c) => c.actor.name)} />
                    </li>
                  ))}
                </RowScroller>
              </div>
            </section>
          )}

          {/* ═══════ ดัชนีดารา A–Z ═══════ */}
          <section id="directory" aria-labelledby="directory-title" className="scroll-mt-24">
            <SectionHead id="directory-title" title={t.home.directoryTitle} description={t.home.directoryDesc(d.stats.actors)} />
            <nav aria-label={t.home.jumpLetter} className="mt-6 flex flex-wrap gap-1">
              {d.directory.map((g) => (
                <a
                  key={g.letter}
                  href={`#dir-${g.letter}`}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-[4px] font-editorial text-lg text-cream/80 transition-colors hover:bg-surface hover:text-gold-light ${focusRing}`}
                >
                  {g.letter}
                </a>
              ))}
            </nav>
            <div className="mt-8 columns-2 gap-10 sm:columns-3 lg:columns-4">
              {d.directory.map((g) => (
                <div key={g.letter} id={`dir-${g.letter}`} className="mb-8 scroll-mt-24 break-inside-avoid">
                  <h3 className="font-editorial text-4xl text-gold-light">{g.letter}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {g.actors.map((a) => (
                      <li key={a.id}>
                        <Link href={`/actors/${a.id}`} className={`group block rounded-sm ${focusRing}`}>
                          <span className="text-[15px] text-cream group-hover:text-gold-light">{a.name}</span>
                          {a.nationality && <span className="ml-2 text-xs text-muted">{a.nationality}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
