import { categoryColorStyle } from "@/lib/palette";
import { cn } from "@/lib/utils";

// Marcador de cor da categoria; sempre acompanha o nome (a cor nunca é a única pista)
export function CategoryDot({ color, className }: { color?: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      style={categoryColorStyle(color)}
      className={cn(
        "size-2.5 shrink-0 rounded-full",
        color ? "bg-(--c-light) dark:bg-(--c-dark)" : "bg-border",
        className,
      )}
    />
  );
}
