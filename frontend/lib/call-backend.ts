// Função única para todas as requisições ao backend, no servidor e no navegador:
//   callBackend<Card[]>("/cards")
//   callBackend("/cards", { method: "POST", body: { name: "Nubank" } })
//   callBackend(`/transactions/${id}`, { method: "DELETE", query: { allInstallments: true } })
//
// Para onde a requisição vai depende de onde ela roda (ver "#backend-target" no package.json):
// - No navegador, vai para /api/*: a rota proxy do Next anexa o token do cookie httpOnly.
// - No servidor (server components e rotas), vai direto à API com o token da sessão.

import { backendTarget, onUnauthorized } from "#backend-target";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type QueryValue = string | number | boolean | null | undefined;

export interface CallBackendOptions {
  method?: HttpMethod;
  body?: unknown;
  // Valores null/undefined são ignorados
  query?: Record<string, QueryValue>;
}

export async function callBackend<T = void>(
  path: string,
  { method = "GET", body, query }: CallBackendOptions = {},
): Promise<T> {
  const target = await backendTarget();

  const response = await fetch(`${target.baseUrl}${path}${queryString(query)}`, {
    method,
    cache: "no-store",
    headers: {
      ...(body !== undefined && { "Content-Type": "application/json" }),
      ...(target.token && { Authorization: `Bearer ${target.token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    await onUnauthorized(response);
    throw new ApiError(response.status, await errorMessage(response));
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

function queryString(query: CallBackendOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `?${search}` : "";
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const { message } = await response.json();
    return Array.isArray(message) ? message.join(". ") : String(message);
  } catch {
    return "Não foi possível completar a operação. Tente novamente.";
  }
}
