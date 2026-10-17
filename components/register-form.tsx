"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User, type LucideIcon } from "lucide-react";
import { register, type RegisterState } from "@/app/actions/auth";
import { focusRing } from "@/components/editorial";
import { fieldClass, iconClass } from "@/components/login-form";
import { useI18n } from "@/lib/i18n/client";

const initialState: RegisterState = {};

function PasswordField({
  id,
  label,
  placeholder,
  icon: Icon,
}: {
  id: string;
  label: string;
  placeholder: string;
  icon: LucideIcon;
}) {
  const [show, setShow] = useState(false);
  const { t } = useI18n();

  return (
    <div>
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <div className="group relative mt-1">
        <Icon className={iconClass} strokeWidth={1.75} aria-hidden />
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          placeholder={placeholder}
          required
          minLength={8}
          className={`${fieldClass} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? t.login.hidePassword : t.login.showPassword}
          className={`absolute right-0 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-sm text-muted transition-colors hover:text-cream ${focusRing}`}
        >
          {show ? (
            <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          ) : (
            <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

export function RegisterForm({ next = null }: { next?: string | null }) {
  const [state, formAction, isPending] = useActionState(register, initialState);
  const { t } = useI18n();
  const m = t.register;

  return (
    <div className="w-full">
      <h1 className="font-editorial text-4xl text-cream sm:text-5xl">{m.title}</h1>
      <p className="mt-3 text-cream/70">{m.subtitle}</p>

      {/* React รีเซ็ตฟอร์มหลังส่ง — ชื่อผู้ใช้/อีเมลกลับมาจาก state ส่วนรหัสผ่านต้องกรอกใหม่ */}
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
            {m.username}
          </label>
          <div className="group relative mt-1">
            <User className={iconClass} strokeWidth={1.75} aria-hidden />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              defaultValue={state.username}
              placeholder={m.usernamePlaceholder}
              aria-describedby="username-hint"
              required
              maxLength={50}
              className={fieldClass}
            />
          </div>
          <p id="username-hint" className="mt-1.5 text-xs text-muted">
            {m.usernameHint}
          </p>
        </div>

        <div>
          <label htmlFor="email" className="text-sm text-muted">
            {m.email}
          </label>
          <div className="group relative mt-1">
            <Mail className={iconClass} strokeWidth={1.75} aria-hidden />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={state.email}
              placeholder={m.emailPlaceholder}
              required
              maxLength={120}
              className={fieldClass}
            />
          </div>
        </div>

        <PasswordField id="password" label={m.password} placeholder={m.passwordPlaceholder} icon={Lock} />
        <PasswordField id="confirmPassword" label={m.confirmPassword} placeholder={m.confirmPlaceholder} icon={ShieldCheck} />

        <button
          type="submit"
          disabled={isPending}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-gold-gradient text-[15px] font-medium text-ink transition-shadow hover:glow-gold disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {isPending ? m.submitting : m.submit}
        </button>

        <p className="text-center text-sm text-muted">
          {m.haveAccount}{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className={`rounded-sm text-gold-light underline decoration-gold-dark underline-offset-4 hover:decoration-gold ${focusRing}`}
          >
            {m.signInLink}
          </Link>
        </p>
      </form>
    </div>
  );
}
