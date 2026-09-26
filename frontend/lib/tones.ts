// Tons coloridos para ícones de destaque (indicadores, títulos, estados vazios).
// Fundo claro do próprio tom + ícone em tom escuro (claro no modo escuro) para ter contraste.
export const TONES = {
  emerald: "bg-[#0b8457]/12 text-[#0a7d52] dark:bg-[#34c28a]/15 dark:text-[#5fd6a4]",
  gold: "bg-[#f4b83a]/25 text-[#8a5a00] dark:bg-[#f4b83a]/15 dark:text-[#f6c75e]",
  sky: "bg-[#2a78d6]/12 text-[#1f5fae] dark:bg-[#3987e5]/18 dark:text-[#8ab8f2]",
  violet: "bg-[#4a3aa7]/12 text-[#4a3aa7] dark:bg-[#9085e9]/18 dark:text-[#b8b0f4]",
  coral: "bg-[#eb6834]/14 text-[#a8431a] dark:bg-[#d95926]/20 dark:text-[#f29a74]",
  rose: "bg-[#e87ba4]/18 text-[#a8325f] dark:bg-[#d55181]/20 dark:text-[#f09bbb]",
} as const;

export type Tone = keyof typeof TONES;
