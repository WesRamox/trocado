import type { LucideIcon } from "lucide-react";
import { TONES, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-8 rounded-lg [&_svg]:size-4",
  md: "size-10 rounded-xl [&_svg]:size-5",
  lg: "size-16 rounded-2xl [&_svg]:size-8",
} as const;

// Ícone num quadradinho colorido
export function IconBadge({
  icon: Icon,
  tone = "emerald",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center", SIZES[size], TONES[tone], className)}>
      <Icon />
    </span>
  );
}
