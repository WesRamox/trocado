import type { CardBrand } from "./types";

// Bandeiras aceitas. Logos em public/card-brands (ver NOTICE.md); "Outra" não tem logo.
export const CARD_BRANDS: { value: CardBrand; label: string; logo: string | null }[] = [
  { value: "VISA", label: "Visa", logo: "/card-brands/visa.svg" },
  { value: "MASTERCARD", label: "Mastercard", logo: "/card-brands/mastercard.svg" },
  { value: "ELO", label: "Elo", logo: "/card-brands/elo.svg" },
  { value: "AMEX", label: "American Express", logo: "/card-brands/amex.svg" },
  { value: "HIPERCARD", label: "Hipercard", logo: "/card-brands/hipercard.svg" },
  { value: "OTHER", label: "Outra", logo: null },
];

export const brandOf = (value: CardBrand) => CARD_BRANDS.find((brand) => brand.value === value)!;
