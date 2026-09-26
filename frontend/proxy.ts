import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/entrar", "/cadastro"];

// Checagem otimista: só olha se o cookie existe. A API valida o token de verdade.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("session");
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  if (!hasSession && !isPublic && pathname !== "/sair") {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
