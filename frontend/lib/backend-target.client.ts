// Destino de callBackend no navegador: a rota proxy /api/* do Next, que anexa o token
// do cookie httpOnly (o JavaScript da página nunca vê o token).

export const SESSION_EXPIRED_HEADER = "x-session-expired";

export async function backendTarget(): Promise<{ baseUrl: string; token?: string }> {
  return { baseUrl: "/api" };
}

// Sessão expirada: o proxy já limpou o cookie. Recarga completa (e não router.push)
// para descartar dados em cache da sessão antiga.
export async function onUnauthorized(response: Response) {
  if (response.headers.has(SESSION_EXPIRED_HEADER)) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/entrar");
  }
}
