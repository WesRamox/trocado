import type { Transaction } from "./types";

// Dias em que você cobra quem usa seus cartões. Cada compra vai para o último dia de cobrança
// até o vencimento da fatura dela (ex.: vence dia 9 -> cobra dia 5; vence dia 20 -> cobra dia 20).
// Vencimento antes do primeiro dia de cobrança fica no primeiro.
export const CHARGE_DAYS = [5, 20] as const;

const signed = (t: Transaction) => (t.type === "OUTFLOW" ? t.amount : -t.amount);
const sum = (items: Transaction[]) => Math.round(items.reduce((total, t) => total + signed(t) * 100, 0)) / 100;

// Fora do crédito não há fatura: vale o dia da compra
export function chargeDayOf(t: Transaction) {
  const dueDay = Number((t.invoiceDueDate ?? t.date).slice(8, 10));
  return CHARGE_DAYS.findLast((day) => day <= dueDay) ?? CHARGE_DAYS[0];
}

export interface ChargeGroup {
  day: number;
  items: Transaction[];
  total: number;
  pending: number;
  // Último dia em que algo do grupo foi recebido
  receivedAt: string | null;
}

// Compras do mês separadas por dia de cobrança; só os dias que têm compras
export function groupByChargeDay(items: Transaction[]): ChargeGroup[] {
  return CHARGE_DAYS.flatMap((day) => {
    const group = items.filter((t) => chargeDayOf(t) === day);
    if (group.length === 0) return [];
    const received = group.flatMap((t) => (t.reimbursedAt ? [t.reimbursedAt] : [])).sort();
    return [
      {
        day,
        items: group,
        total: sum(group),
        pending: sum(group.filter((t) => !t.reimbursedAt)),
        receivedAt: received.at(-1) ?? null,
      },
    ];
  });
}
