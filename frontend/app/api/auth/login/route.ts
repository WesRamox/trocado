import { ApiError, callBackend } from "@/lib/call-backend";
import { clearToken, setToken } from "@/lib/session";

// Login pelo navegador: guarda o token no cookie httpOnly e não o devolve para a página
export async function POST(incoming: Request) {
  // Descarta uma sessão antiga, para a chamada à API não ir com token vencido
  await clearToken();
  try {
    const { access_token } = await callBackend<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: await incoming.json(),
    });
    await setToken(access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
  return new Response(null, { status: 204 });
}
