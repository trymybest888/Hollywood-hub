"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";
import { focusRing } from "@/components/editorial";
import { useI18n } from "@/lib/i18n/client";

const initialState: LoginState = {};

/* ช่องกรอกแบบเส้นใต้ เหมือนช่องค้นหาหน้าแรก (ใช้ร่วมกับฟอร์มสมัครสมาชิก) */
export const fieldClass =
  "h-12 w-full border-0 border-b border-line bg-transparent pl-8 pr-3 text-[16px] text-cream placeholder:text-muted transition-colors focus:border-gold focus:outline-none";
export const iconClass =
  "pointer-events-none absolute left-0 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted transition-colors group-focus-within:text-gold-light";

export function LoginForm({
  next = null,
  showDemoHint = false,
}: {
  /** path ที่จะพากลับไปหลังเข้าสู่ระบบ (ผ่าน safeNext แล้ว) */
  next?: string | null;
  showDemoHint?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useI18n();

  return (
    <div className="w-full">
      <h1 className="font-editorial text-4xl text-cream sm:text-5xl">{t.login.title}</h1>
      <p className="mt-3 text-cream/70">{t.login.subtitle}</p>

      <form action={formAction} className="mt-10 space-y-7" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        {state.error && (
          <div role="alert" className="flex items-start gap-2 border-l-2 border-red-400 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{state.error}</span>
          </div>
        )}

        <div>
          <label htmlFor="username" className="text-sm text-muted">
            {t.login.username}
          </label>
          <div className="group relative mt-1">
            <User className={iconClass} strokeWidth={1.75} aria-hidden />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              defaultValue={state.username}
              placeholder={t.login.usernamePlaceholder}
              required
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="text-sm text-muted">
            {t.login.password}
          </label>
          <div className="group relative mt-1">
            <Lock className={iconClass} strokeWidth={1.75} aria-hidden />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder={t.login.passwordPlaceholder}
              required
              className={`${fieldClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
              className={`absolute right-0 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-sm text-muted transition-colors hover:text-cream ${focusRing}`}
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              ) : (
                <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              )}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-cream/80">
          <input
            type="checkbox"
            name="remember"
            defaultChecked={state.remember}
            className="h-4 w-4 rounded-sm border-line accent-[var(--gold)]"
          />
          {t.login.remember}
        </label>

        <button
          type="submit"
          disabled={isPending}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-gold-gradient text-[15px] font-medium text-ink transition-shadow hover:glow-gold disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {isPending ? t.login.submitting : t.login.submit}
        </button>

        <p className="text-center text-sm text-muted">
          {t.login.noAccount}{" "}
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
            className={`rounded-sm text-gold-light underline decoration-gold-dark underline-offset-4 hover:decoration-gold ${focusRing}`}
          >
            {t.login.signUpLink}
          </Link>
        </p>

        {showDemoHint && (
          <div className="border-y border-line py-4 text-sm">
            <p className="text-muted">{t.login.demo}</p>
            <dl className="mt-2 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-y-1.5 text-cream/85">
              <dt className="text-gold-light">Admin</dt>
              <dd>
                <code>admin</code> <span className="text-muted">/</span> <code>admin123</code>
              </dd>
              <dt className="text-gold-light">User</dt>
              <dd>
                <code>user1</code> <span className="text-muted">/</span> <code>user123</code>
              </dd>
            </dl>
          </div>
        )}
      </form>

    </div>
  );
}
