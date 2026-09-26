import { SESSION_EXPIRED_HEADER } from "@/lib/backend-target.client";
import { API_URL } from "@/lib/backend-target.server";
import { clearToken, getToken } from "@/lib/session";

// Proxy das chamadas do navegador para a API: /api/cards -> {API_URL}/cards.
// O token fica no cookie httpOnly e só é lido aqui, nunca pelo JavaScript da página.
async function forward(request: Request, { params }: RouteContext<"/api/[...path]">) {
  const { path } = await params;
  const { search } = new URL(request.url);
  const token = await getToken();
  const body = request.method === "GET" ? undefined : await request.text();

  const response = await fetch(`${API_URL}/${path.map(encodeURIComponent).join("/")}${search}`, {
    method: request.method,
    cache: "no-store",
    headers: {
      ...(body && { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body || undefined,
  });

  const headers = new Headers();
  const contentType = response.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);
  if (response.status === 401 && token) {
    await clearToken();
    headers.set(SESSION_EXPIRED_HEADER, "1");
  }
  return new Response(response.status === 204 ? null : response.body, {
    status: response.status,
    headers,
  });
}

export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
