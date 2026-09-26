// Indicadores da visão geral, calculados a partir dos lançamentos do mês.
// Valores em reais; percentuais como fração (0.25 = 25%).

import { CATEGORY_COLORS } from "./palette";
import type { Card, Category, Summary, Transaction } from "./types";

// Regra 50/30/20: guardar ao menos 20% da renda e comprometer no máximo 50% com o essencial
export const SAVINGS_GOAL = 0.2;
export const FIXED_LIMIT = 0.5;

const outflows = (transactions: Transaction[]) => transactions.filter((t) => t.type === "OUTFLOW");
const sum = (transactions: Transaction[]) => transactions.reduce((total, t) => total + t.amount, 0);

// Variação relativa; null quando não há base de comparação
export const change = (current: number, previous: number) =>
  previous > 0 ? (current - previous) / previous : null;

// Quanto das entradas sobrou no fim do mês
export const savingsRate = ({ inflow, balance }: Summary) => (inflow > 0 ? balance / inflow : null);

// Dias do mês e quantos já passaram (mês atual: até hoje; passado: todos; futuro: nenhum)
export function monthDays(month: string, today: string) {
  const [year, m] = month.split("-").map(Number);
  const total = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const current = today.slice(0, 7);
  const elapsed = month < current ? total : month > current ? 0 : Number(today.slice(8, 10));
  return { total, elapsed, isCurrent: month === current };
}

// Gastos que se repetem ou já estavam assumidos: recorrências e parcelas
export const isFixed = (t: Transaction) => t.recurrenceId !== null || t.installmentGroupId !== null;

export function spendingPace(transactions: Transaction[], month: string, today: string) {
  const days = monthDays(month, today);
  const spent = outflows(transactions);
  const total = sum(spent);
  const variable = sum(spent.filter((t) => !isFixed(t)));
  const dailyAverage = days.elapsed > 0 ? total / days.elapsed : 0;
  // Projeção: o que já saiu + gastos variáveis no ritmo atual pelos dias que faltam
  const projection =
    days.isCurrent && days.elapsed > 0
      ? total + (variable / days.elapsed) * (days.total - days.elapsed)
      : null;
  return { dailyAverage, projection };
}

export function fixedCommitment(transactions: Transaction[], inflow: number) {
  const fixed = sum(outflows(transactions).filter(isFixed));
  return { fixed, share: inflow > 0 ? fixed / inflow : null };
}

export interface Slice {
  key: string;
  label: string;
  value: number;
  share: number;
  light: string;
  dark: string;
}

// Cinzas para fatias sem cor própria ("Sem categoria" e "Outras")
const NEUTRAL = { light: "#98a4a6", dark: "#5d6f72" };
const NEUTRAL_SOFT = { light: "#c6cfcf", dark: "#3f5256" };
const DARK_BY_LIGHT = new Map<string, string>(CATEGORY_COLORS.map((c) => [c.light, c.dark]));

// Parte das faturas informada só pelo total: fatia própria, separada de "Sem categoria"
const REMAINDER = "remainder";

export interface CategoryRow extends Slice {
  previous: number;
  change: number | null;
}

// Gastos por categoria: as maiores e o resto somado em "Outras" (máximo de 6 fatias)
export function spendingByCategory(
  transactions: Transaction[],
  previousTransactions: Transaction[],
  categories: Category[],
  maxSlices = 6,
): CategoryRow[] {
  const byCategory = (list: Transaction[]) => {
    const totals = new Map<number | null | typeof REMAINDER, number>();
    for (const t of outflows(list)) {
      const key = t.invoiceRemainder ? REMAINDER : t.categoryId;
      totals.set(key, (totals.get(key) ?? 0) + t.amount);
    }
    return totals;
  };
  const current = byCategory(transactions);
  const previous = byCategory(previousTransactions);
  const total = [...current.values()].reduce((a, b) => a + b, 0);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const rows = [...current]
    .map(([categoryId, value]): CategoryRow => {
      const category = typeof categoryId === "number" ? categoryById.get(categoryId) : undefined;
      const color = category?.color
        ? { light: category.color, dark: DARK_BY_LIGHT.get(category.color) ?? category.color }
        : NEUTRAL;
      const previousValue = previous.get(categoryId) ?? 0;
      return {
        key: `c${categoryId ?? "none"}`,
        label: categoryId === REMAINDER ? "Faturas sem detalhe" : (category?.name ?? "Sem categoria"),
        value,
        share: value / total,
        ...color,
        previous: previousValue,
        change: change(value, previousValue),
      };
    })
    .sort((a, b) => b.value - a.value);

  if (rows.length <= maxSlices) return rows;
  const rest = rows.slice(maxSlices - 1);
  const others = rest.reduce((a, r) => a + r.value, 0);
  const othersPrevious = rest.reduce((a, r) => a + r.previous, 0);
  return [
    ...rows.slice(0, maxSlices - 1),
    {
      key: "others",
      label: `Outras (${rest.length})`,
      value: others,
      share: others / total,
      ...NEUTRAL_SOFT,
      previous: othersPrevious,
      change: change(others, othersPrevious),
    },
  ];
}

// Como as saídas foram pagas: crédito, débito ou sem cartão (dinheiro, Pix, boleto)
export function spendingByPaymentMethod(transactions: Transaction[], cards: Card[]): Slice[] {
  const cardType = new Map(cards.map((card) => [card.id, card.type]));
  const groups = [
    { key: "credit", label: "Crédito", light: "#2a78d6", dark: "#3987e5", value: 0 },
    { key: "debit", label: "Débito", light: "#eb6834", dark: "#d95926", value: 0 },
    { key: "none", label: "Pix, dinheiro e boleto", light: "#1baf7a", dark: "#199e70", value: 0 },
  ];
  for (const t of outflows(transactions)) {
    const type = t.cardId === null ? undefined : cardType.get(t.cardId);
    groups[type === "CREDIT" ? 0 : type === "DEBIT" ? 1 : 2].value += t.amount;
  }
  const total = groups.reduce((a, g) => a + g.value, 0);
  return groups.filter((g) => g.value > 0).map((g) => ({ ...g, share: g.value / total }));
}

// Só compras de verdade: o total informado de uma fatura não é um gasto único
export const topExpenses = (transactions: Transaction[], limit = 5) =>
  outflows(transactions)
    .filter((t) => !t.invoiceRemainder)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);

// Orçamentos: quanto de cada limite mensal já foi gasto no mês
export type BudgetStatus = "ok" | "warning" | "over";

// A partir de 80% do orçamento, o gasto entra em alerta
export const BUDGET_WARNING = 0.8;

export interface BudgetRow {
  category: Category;
  budget: number;
  spent: number;
  // Fração usada (pode passar de 1)
  share: number;
  status: BudgetStatus;
}

export function budgetProgress(transactions: Transaction[], categories: Category[]): BudgetRow[] {
  const spentByCategory = new Map<number, number>();
  for (const t of outflows(transactions)) {
    if (t.categoryId !== null) spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amount);
  }
  return categories
    .filter((category) => category.type === "OUTFLOW" && category.monthlyBudget)
    .map((category) => {
      const budget = category.monthlyBudget!;
      const spent = spentByCategory.get(category.id) ?? 0;
      const share = spent / budget;
      const status: BudgetStatus = share > 1 ? "over" : share >= BUDGET_WARNING ? "warning" : "ok";
      return { category, budget, spent, share, status };
    })
    .sort((a, b) => b.share - a.share);
}
