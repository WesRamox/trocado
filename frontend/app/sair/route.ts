import { redirect } from "next/navigation";
import { clearToken } from "@/lib/session";

// Usada quando a sessão expira: limpa o cookie e volta para o login
export async function GET() {
  await clearToken();
  redirect("/entrar");
}
