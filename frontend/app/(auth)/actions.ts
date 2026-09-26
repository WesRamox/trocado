"use server";

import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { text } from "@/lib/form-data";
import { clearToken, setToken } from "@/lib/session";
import type { ActionState } from "@/lib/types";

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { access_token } = await api<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: { email: text(form, "email"), password: text(form, "password") },
    });
    await setToken(access_token);
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  redirect("/");
}

export async function register(_: ActionState, form: FormData): Promise<ActionState> {
  const email = text(form, "email");
  const password = text(form, "password");
  try {
    await api("/auth/register", {
      method: "POST",
      body: { name: text(form, "name"), email, password },
    });
    const { access_token } = await api<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    await setToken(access_token);
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  redirect("/");
}

export async function logout() {
  await clearToken();
  redirect("/entrar");
}
