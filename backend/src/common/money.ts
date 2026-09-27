// Valores são salvos em centavos (Int) e expostos na API em reais (number com 2 casas).

export const toCents = (reais: number): number => Math.round(reais * 100);

export const toReais = (cents: number): number => cents / 100;

// Para mensagens de erro: 123456 -> 'R$ 1.234,56'
export const formatCents = (cents: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

// Divide um total em partes inteiras; os centavos que sobram vão para as primeiras partes.
// Ex.: 1000 em 3 -> [334, 333, 333]
export function splitCents(totalCents: number, parts: number): number[] {
  const base = Math.floor(totalCents / parts);
  const remainder = totalCents % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}
