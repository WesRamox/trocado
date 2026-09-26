import { BrandLogo } from "@/components/cards/brand-logo";
import { cardColor } from "@/lib/palette";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";

type CardLook = Pick<Card, "id" | "name" | "type" | "brand" | "color" | "lastFourDigits" | "closingDay" | "dueDay">;

// Cartão desenhado como o objeto físico, na cor escolhida e com a logo da bandeira
export function CardVisual({ card, className }: { card: CardLook; className?: string }) {
  const patternId = `guilloche-${card.id}`;
  return (
    <div
      className={cn(
        "relative flex aspect-[1.586] flex-col justify-between overflow-hidden rounded-2xl p-5 text-white shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_12px_24px_-12px_rgb(0_0_0/0.45)] transition-colors motion-reduce:transition-none",
        className,
      )}
      style={{ backgroundColor: cardColor(card) }}
    >
      {/* Linhas finas que lembram a gravura das cédulas */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-20" preserveAspectRatio="none">
        <defs>
          <pattern id={patternId} width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="14" cy="14" r="13" fill="none" stroke="white" strokeWidth="0.6" />
            <circle cx="0" cy="0" r="13" fill="none" stroke="white" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect x="45%" width="55%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      <div className="relative flex items-start justify-between gap-2">
        <p className="truncate text-lg font-semibold">{card.name || "Nome do cartão"}</p>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {card.type === "CREDIT" ? "Crédito" : "Débito"}
          </span>
          {card.type === "CREDIT" && card.closingDay && card.dueDay && (
            <span className="text-right text-xs leading-tight text-white/85">
              fecha dia {card.closingDay}
              <br />
              vence dia {card.dueDay}
            </span>
          )}
        </div>
      </div>

      <div className="relative">
        <span aria-hidden className="mb-4 block h-7 w-10 rounded-md bg-gradient-to-br from-[#f3dea0] to-[#c9a44f]" />
        <div className="flex items-end justify-between gap-2">
          <p className="tabular text-lg tracking-[0.2em]">
            <span aria-hidden>•••• </span>
            <span className="sr-only">final </span>
            {card.lastFourDigits || "0000"}
          </p>
          <BrandLogo brand={card.brand} />
        </div>
      </div>
    </div>
  );
}
