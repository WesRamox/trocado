import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "session";

export async function getToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

// Só pode ser chamado em server actions ou route handlers
export async function setToken(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // igual à validade do JWT na API (1 dia)
  });
}

export async function clearToken() {
  (await cookies()).delete(SESSION_COOKIE);
}
