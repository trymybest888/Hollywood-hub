import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "@/components/login-form";
import { AuthShell } from "@/components/auth-shell";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: `${t.login.metaTitle} | Hollywood Stars & Filmography Hub` };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next: rawNext } = await searchParams;
  const next = safeNext(Array.isArray(rawNext) ? rawNext[0] : rawNext);

  // ถ้าล็อกอินอยู่แล้ว ไม่ต้องเห็นหน้า login
  const session = await getSession();
  if (session) redirect(next ?? (session.role === "ADMIN" ? "/admin" : "/"));

  return (
    <AuthShell>
      <LoginForm next={next} showDemoHint />
    </AuthShell>
  );
}
