import { cn } from "@/lib/utils";

// Cor da seta conforme o fundo, como no manual da marca
const ARROW = {
  light: "#0B8457", // fundo claro
  dark: "#34C28A", // fundo escuro (barra lateral)
  auto: "var(--logo-arrow)", // segue o tema: claro ou escuro
} as const;

// Marca Trocado: moeda dourada com seta curva de troca.
// Abaixo de 24px o manual usa a versão simplificada (sem anel interno, traço mais grosso).
export function LogoMark({
  size = 28,
  tone = "auto",
  className,
}: {
  size?: number;
  tone?: keyof typeof ARROW;
  className?: string;
}) {
  const small = size <= 24;
  const arrow = ARROW[tone];
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={cn("shrink-0", className)}>
      <circle cx="32" cy="32" r="18" fill="#F4B83A" />
      {!small && <circle cx="32" cy="32" r="11.5" fill="none" stroke="#D9961A" strokeWidth="3" />}
      <path
        d="M7.56 40.9 A26 26 0 0 1 54.5 19"
        fill="none"
        stroke={arrow}
        strokeWidth={small ? 7 : 6}
        strokeLinecap="round"
      />
      <path
        d="M59.2 15.1 L58.5 25.9 L48.8 21.1 Z"
        fill={arrow}
        stroke={arrow}
        strokeWidth={small ? 3 : 2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Marca + nome. tone="dark" para fundos sempre escuros (barra lateral).
export function Logo({ tone = "auto", className }: { tone?: keyof typeof ARROW; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark tone={tone} />
      Trocado
    </span>
  );
}
