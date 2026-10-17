/**
 * ดึงข้อมูลดาราและภาพยนตร์จริงจาก TMDB (+ จำนวนรางวัลจาก Wikidata)
 *
 *   npx tsx prisma/seed-tmdb.ts
 *
 * - ไม่มีการสุ่มตัวเลข: ถ้าแหล่งข้อมูลไม่มีค่า จะเก็บเป็น null (เช่น รายได้ที่ TMDB ไม่ทราบ)
 * - รันซ้ำได้: upsert ด้วย tmdb_id จึงไม่สร้างดารา/หนังซ้ำ
 * - หนังหนึ่งเรื่องมีแถวเดียว และเชื่อมกับดาราทุกคนที่อยู่ในระบบผ่าน movie_cast
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY?.trim();

const PERSON_PAGES = 6; // หน้าละ 20 คน
const MOVIES_PER_ACTOR = 5;
const CONCURRENCY = 6;
/**
 * ต้องมีบทในภาพยนตร์ที่ไม่ใช่สารคดีอย่างน้อยเท่านี้ — กันบุคคลที่แค่ปรากฏตัวในสารคดี (เช่น นักการเมือง)
 * และคนที่ผลงานส่วนใหญ่เป็นซีรีส์ ซึ่งไม่มีผลงานภาพยนตร์ให้แสดงในเว็บนี้
 */
const MIN_ACTING_CREDITS = 3;
const DOCUMENTARY_GENRE = 99;

/**
 * บุคคลที่ไม่ใช่นักแสดงแต่หลุดตัวกรองด้านบน (หนังเกี่ยวกับเขาบางเรื่องไม่ได้ติดแท็กสารคดีใน TMDB)
 * — ข้ามเสมอ และลบออกถ้ามีอยู่ในระบบแล้ว (tmdb person id)
 */
const EXCLUDED_PEOPLE = new Set<number>([
  2342141, // Xi Jinping
]);

const genreMap: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

/* ───────────────────────── TMDB types ───────────────────────── */

interface TmdbPopularPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department?: string;
}

interface TmdbCastCredit {
  id: number;
  title?: string;
  genre_ids?: number[];
  poster_path: string | null;
  release_date?: string;
  vote_count?: number;
}

interface TmdbPersonDetail {
  id: number;
  name: string;
  birthday: string | null;
  place_of_birth: string | null;
  biography: string;
  profile_path: string | null;
  movie_credits?: { cast: TmdbCastCredit[] };
  external_ids?: { wikidata_id: string | null };
}

interface TmdbMovieDetail {
  id: number;
  title: string;
  release_date: string;
  genres: { id: number; name: string }[];
  revenue: number;
  vote_average: number;
  vote_count: number;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  runtime: number | null;
  original_language: string;
  popularity: number;
  credits?: { cast: { id: number; character: string | null; order: number }[] };
  videos?: {
    results: {
      key: string;
      site: string;
      type: string;
      official: boolean;
      iso_639_1: string;
      published_at?: string;
    }[];
  };
  release_dates?: {
    results: { iso_3166_1: string; release_dates: { certification: string; type: number }[] }[];
  };
  reviews?: {
    results: {
      id: string;
      author: string;
      content: string;
      url: string;
      created_at: string;
      author_details?: { rating: number | null };
    }[];
  };
  "watch/providers"?: { results: Record<string, TmdbProviderRegion> };
  translations?: { translations: { iso_639_1: string; data: { overview?: string; title?: string } }[] };
}

interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}
type TmdbProviderRegion = Partial<Record<"flatrate" | "rent" | "buy", TmdbProvider[]>>;

function thaiOverview(m: TmdbMovieDetail): string | null {
  const th = m.translations?.translations.find((t) => t.iso_639_1 === "th");
  return th?.data.overview?.trim() || null;
}

/** ตัวอย่างหนังทางการบน YouTube (ภาษาอังกฤษก่อน) */
function pickTrailer(m: TmdbMovieDetail): string | null {
  const vids = (m.videos?.results ?? []).filter((v) => v.site === "YouTube" && v.type === "Trailer");
  // ทางการ → ภาษาอังกฤษ → ปล่อยก่อน (กันตัวอย่างฉายซ้ำ/re-release ที่ออกทีหลังมาแทนตัวอย่างหลัก)
  vids.sort(
    (a, b) =>
      Number(b.official) - Number(a.official) ||
      Number(b.iso_639_1 === "en") - Number(a.iso_639_1 === "en") ||
      (a.published_at ?? "9999").localeCompare(b.published_at ?? "9999"),
  );
  return vids[0]?.key.slice(0, 20) ?? null;
}

/** เรทของสหรัฐฯ (เข้าโรง type 3 ก่อน) */
function pickCertification(m: TmdbMovieDetail): string | null {
  const us = m.release_dates?.results.find((r) => r.iso_3166_1 === "US");
  const dates = [...(us?.release_dates ?? [])].sort((a, b) => Number(b.type === 3) - Number(a.type === 3));
  return dates.find((d) => d.certification.trim())?.certification.trim().slice(0, 10) ?? null;
}

/* ───────────────────────── helpers ───────────────────────── */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// รองรับทั้ง API Key (v3) และ Read Access Token (v4, ขึ้นต้นด้วย eyJ)
const isBearer = TMDB_API_KEY?.startsWith("eyJ") ?? false;

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (!isBearer) url.searchParams.set("api_key", TMDB_API_KEY!);

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      headers: isBearer ? { Authorization: `Bearer ${TMDB_API_KEY}` } : {},
    });
    if (res.ok) return (await res.json()) as T;
    // 429 = โดนจำกัดอัตรา → รอแล้วลองใหม่
    if (res.status === 429 && attempt < 5) {
      await sleep(Number(res.headers.get("retry-after") ?? 1) * 1000 * attempt);
      continue;
    }
    throw new Error(`TMDB ${path} → HTTP ${res.status}`);
  }
}

const image = (path: string | null) =>
  path ? `https://image.tmdb.org/t/p/w500${path}` : null;

/** ปีจาก "YYYY-MM-DD" (คืน null ถ้าไม่มี/ไม่ถูกต้อง) */
function yearOf(date: string | null | undefined): number | null {
  const y = Number(date?.slice(0, 4));
  return Number.isInteger(y) && y >= 1888 ? y : null;
}

/** แปลงสถานที่เกิดเป็นชื่อประเทศมาตรฐาน — ไม่ทราบ = null (ไม่เดาเป็น USA) */
function normalizeCountry(rawPlace: string | null | undefined): string | null {
  const original = rawPlace?.split(",").pop()?.trim();
  if (!original) return null;
  const c = original.toLowerCase();

  if (c.includes("korea")) return "South Korea";
  if (c === "people's republic of china") return "China";
  if (c === "republic of china") return "Taiwan"; // ชื่อทางการของไต้หวันใน Wikidata
  if (c === "british hong kong" || c === "hong kong sar") return "Hong Kong";
  if (c === "kingdom of the netherlands") return "Netherlands";
  if (["usa", "us", "u.s.", "u.s.a.", "united states", "united states of america"].includes(c)) {
    return "USA";
  }
  if (
    ["uk", "u.k.", "united kingdom", "england", "great britain", "scotland", "wales", "northern ireland"]
      .includes(c)
  ) {
    return "United Kingdom";
  }
  return (original.charAt(0).toUpperCase() + original.slice(1)).slice(0, 60);
}

/** รันงานขนานกันทีละ `limit` งาน */
async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

type WikidataClaim = {
  rank: "preferred" | "normal" | "deprecated";
  mainsnak: { datavalue?: { value: { id: string } } };
};
type WikidataEntity = {
  claims?: Record<string, WikidataClaim[]>;
  labels?: Record<string, { value: string }>;
};

/** เรียก wbgetentities ทีละ 50 รายการ (ขีดจำกัดของ API) — ล้มเหลวทั้งชุดก็ข้ามไป */
async function wikidataEntities(ids: string[], props: string): Promise<Record<string, WikidataEntity>> {
  const out: Record<string, WikidataEntity> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url =
      `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&props=${props}&ids=` +
      batch.join("|");
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "HollywoodHubSeed/1.0 (local development seed script)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { entities: Record<string, WikidataEntity> };
      Object.assign(out, data.entities);
    } catch (err) {
      console.warn(`  เรียก Wikidata ไม่สำเร็จ (${batch.length} รายการ):`, err);
    }
  }
  return out;
}

/** ค่าของ claim ที่ไม่ถูกเลิกใช้ เรียง preferred ก่อน */
function claimIds(entity: WikidataEntity, property: string): string[] {
  const claims = (entity.claims?.[property] ?? []).filter((c) => c.rank !== "deprecated");
  claims.sort((a, b) => Number(b.rank === "preferred") - Number(a.rank === "preferred"));
  return claims.map((c) => c.mainsnak.datavalue?.value.id).filter((id): id is string => Boolean(id));
}

/**
 * ข้อมูลจาก Wikidata ต่อคน:
 *  - awards: จำนวนรางวัลที่ได้รับ (P166) — null ถ้าไม่มีข้อมูล (ไม่ได้แปลว่าไม่เคยได้รางวัล)
 *  - nationality: สัญชาติ (P27 country of citizenship) — null ถ้าไม่มีข้อมูล
 */
async function fetchWikidataFacts(
  personIds: string[],
): Promise<Map<string, { awards: number | null; nationality: string | null }>> {
  const people = await wikidataEntities(personIds, "claims");

  const countryOf = new Map<string, string>(); // person Q-id → country Q-id
  for (const [id, entity] of Object.entries(people)) {
    const country = claimIds(entity, "P27")[0];
    if (country) countryOf.set(id, country);
  }
  const countries = await wikidataEntities([...new Set(countryOf.values())], "labels");

  const facts = new Map<string, { awards: number | null; nationality: string | null }>();
  for (const [id, entity] of Object.entries(people)) {
    if (!entity.claims) continue; // ไม่พบ entity
    const awards = new Set(claimIds(entity, "P166")).size;
    const countryId = countryOf.get(id);
    const label = countryId ? countries[countryId]?.labels?.en?.value : undefined;
    facts.set(id, { awards: awards > 0 ? awards : null, nationality: normalizeCountry(label) });
  }
  return facts;
}

/* ───────────────────────── main ───────────────────────── */

async function main() {
  if (!TMDB_API_KEY) {
    throw new Error("กรุณาระบุ TMDB_API_KEY ในไฟล์ .env ก่อนรัน");
  }

  console.log("กำลังดึงรายชื่อดาราจาก TMDB...");

  // 1) รายชื่อดารายอดนิยม (เฉพาะนักแสดงที่มีรูป)
  const people: TmdbPopularPerson[] = [];
  const seenPeople = new Set<number>();
  for (let page = 1; page <= PERSON_PAGES; page++) {
    const { results } = await tmdb<{ results: TmdbPopularPerson[] }>("/person/popular", {
      page: String(page),
    });
    for (const p of results) {
      if (EXCLUDED_PEOPLE.has(p.id)) {
        const removed = await prisma.actors.deleteMany({ where: { tmdb_id: p.id } });
        console.log(`  ข้าม ${p.name}: อยู่ในรายชื่อยกเว้น` + (removed.count ? " — ลบออกจากระบบแล้ว" : ""));
        continue;
      }
      if (p.known_for_department === "Acting" && p.profile_path && !seenPeople.has(p.id)) {
        seenPeople.add(p.id);
        people.push(p);
      }
    }
  }
  console.log(`พบนักแสดง ${people.length} คน`);

  // 2) รายละเอียดดารา + เครดิตหนัง → upsert ดารา
  const actorIdByTmdb = new Map<number, number>(); // tmdb person id → actors.id
  const wikidataByActor = new Map<number, string>(); // actors.id → Q-id
  const movieTmdbIds = new Set<number>();

  await mapLimit(people, CONCURRENCY, async (person) => {
    try {
      const d = await tmdb<TmdbPersonDetail>(`/person/${person.id}`, {
        append_to_response: "movie_credits,external_ids",
      });

      // นับเฉพาะบทแสดงในหนังที่ไม่ใช่สารคดี (ปรากฏตัวในสารคดีไม่นับเป็นนักแสดง)
      const actingCredits = (d.movie_credits?.cast ?? []).filter(
        (m) => !(m.genre_ids ?? []).includes(DOCUMENTARY_GENRE),
      );
      if (actingCredits.length < MIN_ACTING_CREDITS) {
        const removed = await prisma.actors.deleteMany({ where: { tmdb_id: d.id } });
        console.log(
          `  ข้าม ${d.name}: มีผลงานภาพยนตร์ (ไม่นับสารคดี) แค่ ${actingCredits.length} เรื่อง` +
            (removed.count ? " — ลบออกจากระบบแล้ว" : ""),
        );
        return;
      }

      const data = {
        name: d.name.slice(0, 120),
        // ใช้ประเทศที่เกิดไปก่อน แล้วแทนด้วยสัญชาติจาก Wikidata ในขั้นที่ 4 ถ้ามี
        nationality: normalizeCountry(d.place_of_birth),
        birth_date: d.birthday ? new Date(`${d.birthday}T00:00:00.000Z`) : null,
        bio: d.biography?.trim() ? d.biography.trim().slice(0, 10_000) : null,
        avatar_url: image(d.profile_path),
      };
      const actor = await prisma.actors.upsert({
        where: { tmdb_id: d.id },
        create: { tmdb_id: d.id, ...data },
        update: data,
        select: { id: true },
      });
      actorIdByTmdb.set(d.id, actor.id);
      if (d.external_ids?.wikidata_id) wikidataByActor.set(actor.id, d.external_ids.wikidata_id);

      actingCredits
        .filter((m) => m.title && m.poster_path && m.release_date)
        .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
        .slice(0, MOVIES_PER_ACTOR)
        .forEach((m) => movieTmdbIds.add(m.id));

      console.log(`  [ดารา ${actorIdByTmdb.size}] ${d.name} (${data.nationality ?? "ไม่ระบุสัญชาติ"})`);
    } catch (err) {
      console.error(`  ข้าม ${person.name}:`, err);
    }
  });

  // 3) รายละเอียดหนัง (หนึ่งเรื่องดึงครั้งเดียว) + เชื่อมดาราทุกคนที่อยู่ในระบบ
  console.log(`\nกำลังดึงภาพยนตร์ ${movieTmdbIds.size} เรื่อง...`);
  let movieCount = 0;
  let castCount = 0;

  await mapLimit([...movieTmdbIds], CONCURRENCY, async (tmdbId) => {
    try {
      const m = await tmdb<TmdbMovieDetail>(`/movie/${tmdbId}`, {
        append_to_response: "credits,videos,release_dates,reviews,watch/providers,translations",
      });

      const genre =
        m.genres
          .map((g) => genreMap[g.id] ?? g.name)
          .slice(0, 3)
          .join(", ")
          .slice(0, 100) || null;

      const data = {
        title: m.title.slice(0, 200),
        release_year: yearOf(m.release_date),
        genre,
        // TMDB revenue เป็นดอลลาร์ — 0 หมายถึง "ไม่ทราบ" จึงเก็บเป็น null
        box_office_mil: m.revenue > 0 ? Math.round(m.revenue / 10_000) / 100 : null,
        rating: m.vote_count > 0 ? Math.round(m.vote_average * 10) / 10 : null,
        poster_url: image(m.poster_path),
        backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
        // เรื่องย่อภาษาไทยถ้ามีคำแปลบน TMDB ไม่มีจึงใช้ภาษาอังกฤษ
        overview: thaiOverview(m) ?? (m.overview?.trim() ? m.overview.trim() : null),
        // เรื่องย่อภาษาอังกฤษ (ขอข้อมูลด้วย language=en-US) ใช้ตอนผู้ชมเลือกภาษา EN
        overview_en: m.overview?.trim() || null,
        runtime: m.runtime && m.runtime > 0 ? m.runtime : null,
        certification: pickCertification(m),
        trailer_key: pickTrailer(m),
        release_date: /^\d{4}-\d{2}-\d{2}$/.test(m.release_date) ? new Date(`${m.release_date}T00:00:00.000Z`) : null,
        original_language: m.original_language?.slice(0, 5) || null,
        popularity: Math.round(m.popularity * 1000) / 1000,
        vote_count: m.vote_count,
      };
      const movie = await prisma.movies.upsert({
        where: { tmdb_id: m.id },
        create: { tmdb_id: m.id, ...data },
        update: data,
        select: { id: true },
      });
      movieCount++;

      // รีวิวจากผู้ชม (สูงสุด 3 รีวิวต่อเรื่อง)
      for (const r of (m.reviews?.results ?? []).slice(0, 3)) {
        const review = {
          movie_id: movie.id,
          author: r.author.slice(0, 120),
          content: r.content.trim().slice(0, 20_000),
          rating: r.author_details?.rating ?? null,
          url: r.url.slice(0, 500),
          written_at: r.created_at ? new Date(r.created_at) : null,
        };
        await prisma.movie_reviews.upsert({
          where: { tmdb_id: r.id },
          create: { tmdb_id: r.id.slice(0, 40), ...review },
          update: review,
        });
      }

      // ดูได้ที่ไหน: ใช้ข้อมูลประเทศไทยก่อน ถ้าไม่มีใช้สหรัฐฯ
      const regions = m["watch/providers"]?.results ?? {};
      const region = regions.TH ? "TH" : regions.US ? "US" : null;
      await prisma.movie_providers.deleteMany({ where: { movie_id: movie.id } });
      if (region) {
        const rows = (["flatrate", "rent", "buy"] as const).flatMap((kind) =>
          (regions[region][kind] ?? []).map((p) => ({
            movie_id: movie.id,
            provider_id: p.provider_id,
            kind,
            provider_name: p.provider_name.slice(0, 80),
            logo_url: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
            region,
            priority: Math.min(p.display_priority, 65_535),
          })),
        );
        if (rows.length) await prisma.movie_providers.createMany({ data: rows, skipDuplicates: true });
      }

      const seen = new Set<number>();
      for (const c of m.credits?.cast ?? []) {
        const actorId = actorIdByTmdb.get(c.id);
        if (!actorId || seen.has(actorId)) continue;
        seen.add(actorId);
        const castData = {
          role_name: c.character?.trim() ? c.character.trim().slice(0, 120) : null,
          billing_order: Math.min(c.order, 65_535),
        };
        await prisma.movie_cast.upsert({
          where: { movie_id_actor_id: { movie_id: movie.id, actor_id: actorId } },
          create: { movie_id: movie.id, actor_id: actorId, ...castData },
          update: castData,
        });
        castCount++;
      }
    } catch (err) {
      console.error(`  ข้ามหนัง TMDB #${tmdbId}:`, err);
    }
  });

  // 4) สัญชาติ + จำนวนรางวัลจาก Wikidata
  console.log(`
กำลังดึงสัญชาติและรางวัลจาก Wikidata (${wikidataByActor.size} คน)...`);
  const facts = await fetchWikidataFacts([...new Set(wikidataByActor.values())]);
  for (const [actorId, qid] of wikidataByActor) {
    const f = facts.get(qid);
    if (!f) continue;
    await prisma.actors.update({
      where: { id: actorId },
      data: {
        awards_count: f.awards,
        ...(f.nationality ? { nationality: f.nationality } : {}),
      },
    });
  }

  // 5) หนังจาก TMDB ที่ไม่เหลือนักแสดงในระบบแล้ว (เช่น ดาราถูกลบเพราะไม่ใช่นักแสดง)
  const orphans = await prisma.movies.deleteMany({
    where: { tmdb_id: { not: null }, cast: { none: {} } },
  });
  if (orphans.count) console.log(`ลบภาพยนตร์ที่ไม่มีนักแสดงในระบบ ${orphans.count} เรื่อง`);

  console.log(
    `\nเสร็จสิ้น! ดารา ${actorIdByTmdb.size} คน, ภาพยนตร์ ${movieCount} เรื่อง, เครดิตนักแสดง ${castCount} รายการ`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
