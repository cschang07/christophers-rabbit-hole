"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SITE_AUTH_COOKIE,
  SITE_AUTH_MAX_AGE,
  createAuthToken,
  verifyPassword,
} from "@/lib/site-auth";

export type LoginState = { error?: string } | undefined;

export async function login(
  _state: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!verifyPassword(password)) {
    return { error: "密碼錯誤" };
  }

  const cookieStore = await cookies();
  cookieStore.set(SITE_AUTH_COOKIE, createAuthToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SITE_AUTH_MAX_AGE,
  });

  redirect(next.startsWith("/") ? next : "/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SITE_AUTH_COOKIE);
  redirect("/login");
}
