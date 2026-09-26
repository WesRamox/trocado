const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatMoney = (value: number) => brl.format(value);

// Eixos de gráfico: "R$ 8 mil"
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
export const formatMoneyCompact = (value: number) => brlCompact.format(value);

const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });
export const formatPercent = (value: number) => percent.format(value);

// '2026-09-24' -> Date em UTC, para não mudar de dia com o fuso
const toDate = (date: string) => new Date(`${date}T00:00:00Z`);

export const formatDate = (date: string) =>
  toDate(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });

export const formatLongDate = (date: string) =>
  toDate(date).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

// Hoje ('YYYY-MM-DD') no fuso informado. Sem fuso, usa o do ambiente: no navegador é o da pessoa;
// no servidor, passe o fuso do perfil (o servidor pode estar em outro fuso).
export function today(timeZone?: string) {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function currentMonth(timeZone?: string) {
  return today(timeZone).slice(0, 7);
}

// Mês válido da URL ('YYYY-MM') ou o mês atual no fuso informado
export function parseMonth(value: string | string[] | undefined, timeZone?: string) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : currentMonth(timeZone);
}

export function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// '2026-09' -> 'setembro de 2026'
export const monthLabel = (month: string) =>
  capitalize(toDate(`${month}-01`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }));

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const monthShort = (month: string) =>
  toDate(`${month}-01`).toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "");

export const monthName = (month: string) =>
  toDate(`${month}-01`).toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });
