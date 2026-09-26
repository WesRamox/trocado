/* eslint-disable @next/next/no-img-element -- SVG estático pequeno; não precisa do otimizador de imagens */
import { brandOf } from "@/lib/card-brands";
import type { CardBrand } from "@/lib/types";
import { cn } from "@/lib/utils";

// Logo da bandeira numa plaquinha branca, legível sobre qualquer cor de cartão.
// "Outra" não tem logo: não mostra nada.
export function BrandLogo({ brand, className }: { brand: CardBrand; className?: string }) {
  const { logo, label } = brandOf(brand);
  if (!logo) return null;
  return (
    <span className={cn("grid h-8 w-14 shrink-0 place-items-center rounded-md bg-white px-1.5 shadow-sm", className)}>
      <img src={logo} alt={label} className="max-h-5 max-w-full" />
    </span>
  );
}
