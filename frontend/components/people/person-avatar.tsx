import { CATEGORY_COLORS, categoryColorStyle } from "@/lib/palette";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "size-5 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
} as const;

// Cor escolhida, ou uma automática pelo id
export const personColor = (person: Pick<Person, "id" | "color">) =>
  person.color ?? CATEGORY_COLORS[person.id % CATEGORY_COLORS.length].light;

// Bolinha com a inicial da pessoa, na cor dela
export function PersonAvatar({
  person,
  size = "sm",
  className,
}: {
  person: Pick<Person, "id" | "name" | "color">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={categoryColorStyle(personColor(person))}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-(--c-light) font-semibold text-white dark:bg-(--c-dark)",
        SIZES[size],
        className,
      )}
    >
      {person.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
