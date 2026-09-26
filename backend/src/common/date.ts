// Datas sem horário (colunas @db.Date) são tratadas como meia-noite UTC.

export function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// Para campos de PATCH: mantém undefined (não alterar) e null (limpar)
export function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  return parseDate(value);
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Fuso de quem ainda não escolheu outro (e das contas criadas antes de existir a coluna)
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

// Data de hoje no fuso da pessoa: às 23h de 26/09 em São Paulo já é 27/09 em UTC,
// mas o "hoje" dela ainda é 26/09.
export function today(timeZone = DEFAULT_TIMEZONE, now = new Date()): Date {
  // en-CA formata como YYYY-MM-DD
  return parseDate(new Intl.DateTimeFormat('en-CA', { timeZone }).format(now));
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Soma meses mantendo o dia; se o mês não tiver esse dia, usa o último (31/01 + 1 -> 28/02).
export function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDayOfMonth)));
}

// Mesmo mês, no dia informado; se o mês não tiver esse dia, usa o último (dia 31 em fev -> 28)
export function withDay(date: Date, day: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDayOfMonth)));
}

// '2026-09' -> [01/09/2026, 01/10/2026)
export function monthRange(month: string): { start: Date; end: Date } {
  const start = parseDate(`${month}-01`);
  return { start, end: addMonths(start, 1) };
}

// '2026-04', '2026-06' -> ['2026-04', '2026-05', '2026-06']
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  for (let date = parseDate(`${from}-01`); formatDate(date).slice(0, 7) <= to; date = addMonths(date, 1)) {
    months.push(formatDate(date).slice(0, 7));
  }
  return months;
}

export function currentMonth(timeZone = DEFAULT_TIMEZONE): string {
  return formatDate(today(timeZone)).slice(0, 7);
}
