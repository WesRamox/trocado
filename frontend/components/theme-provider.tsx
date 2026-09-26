"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Tema claro/escuro: segue o sistema até a pessoa escolher no switch (escolha salva no navegador)
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
