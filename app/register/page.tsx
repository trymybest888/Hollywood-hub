import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";
import { RegisterForm } from "@/components/register-form";
import { AuthShell } from "@/components/auth-shell";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: `${t.register.metaTitle} | Hollywood Stars & Filmography Hub` };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next: rawNext } = await searchParams;
  const next = safeNext(Array.isArray(rawNext) ? rawNext[0] : rawNext);

  // มีบัญชีและล็อกอินอยู่แล้ว ไม่ต้องสมัครใหม่
  const session = await getSession();
  if (session) redirect(next ?? (session.role === "ADMIN" ? "/admin" : "/"));

  return (
    <AuthShell>
      <RegisterForm next={next} />
    </AuthShell>
  );
}
