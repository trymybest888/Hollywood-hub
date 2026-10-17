"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession, type SessionPayload } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";
import { getI18n } from "@/lib/i18n/server";
import { FieldError } from "@/lib/form";

export interface LoginState {
  error?: string;
  username?: string;
  remember?: boolean;
}

// hash ปลอมไว้เทียบเมื่อไม่พบ username เพื่อให้เวลาตอบสนองใกล้เคียงกัน (กัน user enumeration)
const DUMMY_HASH =
  "$2b$10$9d2dBJXnv9gb3gEUgQP2oOSgG3A4KjoDmiVcWewgN9QsgSanOD8HK";

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const next = safeNext(formData.get("next"));
  const { t } = await getI18n();

  if (!username || !password) {
    return { error: t.login.errorEmpty, username, remember };
  }

  const user = await prisma.users.findUnique({
    where: { username },
    select: { id: true, username: true, password_hash: true, role: true },
  });

  const isValid = await bcrypt.compare(
    password,
    user?.password_hash ?? DUMMY_HASH,
  );

  if (!user || !isValid) {
    return { error: t.login.errorWrong, username, remember };
  }

  await createSession(
    {
      userId: user.id,
      username: user.username,
      role: user.role, // "ADMIN" | "USER"
    },
    remember,
  );

  // redirect() ต้องเรียกนอก try/catch
  redirect(next ?? (user.role === "ADMIN" ? "/admin" : "/"));
}

export interface RegisterState {
  error?: string;
  username?: string;
  email?: string;
}

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,50}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? ""); // ห้าม trim รหัสผ่าน
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const next = safeNext(formData.get("next"));
  const { t } = await getI18n();
  const m = t.register;

  let session: SessionPayload;
  try {
    if (!USERNAME_RE.test(username)) throw new FieldError(m.errorUsername);
    if (email.length > 120 || !EMAIL_RE.test(email)) throw new FieldError(m.errorEmail);
    if (password.length < 8) throw new FieldError(m.errorPasswordShort);
    // bcrypt ใช้ได้แค่ 72 ไบต์แรก (ภาษาไทย 1 ตัว = 3 ไบต์)
    if (Buffer.byteLength(password, "utf8") > 72) throw new FieldError(m.errorPasswordLong);
    if (password !== confirmPassword) throw new FieldError(m.errorMismatch);

    // collation ของ MySQL ไม่สนตัวพิมพ์เล็ก/ใหญ่ — "Admin" ชนกับ "admin"
    const existing = await prisma.users.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { username: true },
    });
    if (existing) {
      throw new FieldError(
        existing.username.toLowerCase() === username.toLowerCase() ? m.errorUsernameTaken : m.errorEmailTaken,
      );
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      // role กำหนดฝั่งเซิร์ฟเวอร์เสมอ ห้ามรับจากฟอร์ม
      data: { username, email, password_hash, role: "USER" },
      select: { id: true, username: true, role: true },
    });
    session = { userId: user.id, username: user.username, role: user.role };
  } catch (e) {
    if (e instanceof FieldError) return { error: e.message, username, email };
    // สมัครพร้อมกัน 2 คำขอ: unique constraint ใน DB ชนกัน
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: m.errorTaken, username, email };
    }
    console.error(e);
    return { error: t.form.generic, username, email };
  }

  await createSession(session, false);
  redirect(next ?? "/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/");
}
