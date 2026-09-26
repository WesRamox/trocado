import "server-only";
import { cache } from "react";
import { callBackend } from "./call-backend";
import type { User } from "./types";

// Perfil de quem está logado, buscado uma vez por requisição (layout e páginas compartilham)
export const getProfile = cache(() => callBackend<User>("/auth/profile"));
