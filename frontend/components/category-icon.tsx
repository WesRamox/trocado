import { createElement } from "react";
import { iconFor } from "@/lib/category-icons";
import { categoryColorStyle } from "@/lib/palette";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "size-5 rounded-md [&_svg]:size-3",
  sm: "size-8 rounded-lg [&_svg]:size-4",
  md: "size-10 rounded-xl [&_svg]:size-5",
} as const;

// Ícone da categoria num quadradinho com a cor dela.
// Fundo: a cor bem clara; ícone: a cor escurecida (clareada no modo escuro) para ter contraste.
// Sempre acompanha o nome da categoria: a cor nunca é a única pista.
export function CategoryIcon({
  category,
  size = "md",
  className,
}: {
  category?: Pick<Category, "name" | "icon" | "color">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const colored = !!category?.color;
  return (
    <span
      aria-hidden
      style={categoryColorStyle(category?.color)}
      className={cn(
        "grid shrink-0 place-items-center",
        SIZES[size],
        colored
          ? "bg-[color-mix(in_oklab,var(--c-light)_16%,transparent)] text-[color-mix(in_oklab,var(--c-light)_75%,black)] dark:bg-[color-mix(in_oklab,var(--c-dark)_24%,transparent)] dark:text-[color-mix(in_oklab,var(--c-dark)_65%,white)]"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {/* iconFor devolve um componente já existente (mapa fixo), não cria um novo */}
      {createElement(iconFor(category))}
    </span>
  );
}
