import "server-only";
import { redirect } from "next/navigation";
import { getToken } from "./session";

// Destino de callBackend no servidor (server components e rotas): direto na API, com o token da sessão.
// Escolhido pelo import "#backend-target" (package.json) na condição "react-server".

export const API_URL = process.env.API_URL ?? "http://localhost:3333";

export async function backendTarget() {
  return { baseUrl: API_URL, token: await getToken() };
}

// Sessão expirada: /sair limpa o cookie e volta para o login
export async function onUnauthorized(response: Response) {
  if (response.status === 401 && (await getToken())) {
    redirect("/sair");
  }
}
