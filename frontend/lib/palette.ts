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

// Cores das cédulas de real, usadas só no desenho dos cartões (com texto branco por cima)
const BANKNOTE_COLORS = ["#2f63a8", "#6b4fa8", "#b8483a", "#9a6a12", "#8f5a2b", "#1f6f78", "#3f7d4e", "#5b6570"];

export const cardColor = (id: number) => BANKNOTE_COLORS[id % BANKNOTE_COLORS.length];
