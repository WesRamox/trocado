// Paleta de categorias validada (daltonismo e contraste) com variante para o modo escuro.
// A API guarda a cor clara; a escura é derivada daqui.
export const CATEGORY_COLORS = [
  { name: "Azul", light: "#2a78d6", dark: "#3987e5" },
  { name: "Laranja", light: "#eb6834", dark: "#d95926" },
  { name: "Água", light: "#1baf7a", dark: "#199e70" },
  { name: "Amarelo", light: "#eda100", dark: "#c98500" },
  { name: "Rosa", light: "#e87ba4", dark: "#d55181" },
  { name: "Verde", light: "#008300", dark: "#008300" },
  { name: "Violeta", light: "#4a3aa7", dark: "#9085e9" },
  { name: "Vermelho", light: "#e34948", dark: "#e66767" },
] as const;

const DARK_BY_LIGHT = new Map<string, string>(CATEGORY_COLORS.map((color) => [color.light, color.dark]));

// Variáveis CSS para pintar algo com a cor da categoria nos dois temas
export function categoryColorStyle(color: string | null | undefined): React.CSSProperties {
  if (!color) return {};
  return { "--c-light": color, "--c-dark": DARK_BY_LIGHT.get(color) ?? color } as React.CSSProperties;
}

// Cores dos cartões (inspiradas nas cédulas de real). Todas com texto branco acima de 4.5:1.
export const CARD_COLORS = [
  { name: "Azul", hex: "#2f63a8" },
  { name: "Violeta", hex: "#6b4fa8" },
  { name: "Vermelho", hex: "#b8483a" },
  { name: "Rosa", hex: "#a8325f" },
  { name: "Ocre", hex: "#9a6a12" },
  { name: "Terra", hex: "#8f5a2b" },
  { name: "Petróleo", hex: "#1f6f78" },
  { name: "Verde", hex: "#3f7d4e" },
  { name: "Esmeralda", hex: "#0a7d52" },
  { name: "Grafite", hex: "#5b6570" },
  { name: "Preto", hex: "#1c1f24" },
] as const;

// Cor escolhida, ou uma automática pelo id para cartões sem cor salva
export const cardColor = (card: { id: number; color: string | null }) =>
  card.color ?? CARD_COLORS[card.id % CARD_COLORS.length].hex;
