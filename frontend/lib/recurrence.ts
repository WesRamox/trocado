import type { Recurrence, RecurrenceFrequency } from "./types";

const toDate = (date: string) => new Date(`${date}T00:00:00Z`);

export const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string; unit: [string, string] }[] = [
  { value: "MONTHLY", label: "Mensal", unit: ["mês", "meses"] },
  { value: "WEEKLY", label: "Semanal", unit: ["semana", "semanas"] },
  { value: "YEARLY", label: "Anual", unit: ["ano", "anos"] },
  { value: "DAILY", label: "Diária", unit: ["dia", "dias"] },
];

// Ex.: "Todo mês, no dia 5", "A cada 2 semanas, às quintas-feiras", "Todo ano, em 5 de julho"
export function describeSchedule({ frequency, interval, startDate }: Pick<Recurrence, "frequency" | "interval" | "startDate">) {
  const date = toDate(startDate);
  const day = date.getUTCDate();
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" });
  const dayMonth = date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" });

  switch (frequency) {
    case "DAILY":
      return interval === 1 ? "Todo dia" : `A cada ${interval} dias`;
    case "WEEKLY":
      return `${interval === 1 ? "Toda semana" : `A cada ${interval} semanas`}, ${weekdayPhrase(weekday)}`;
    case "MONTHLY":
      return `${interval === 1 ? "Todo mês" : `A cada ${interval} meses`}, no dia ${day}`;
    case "YEARLY":
      return `${interval === 1 ? "Todo ano" : `A cada ${interval} anos`}, em ${dayMonth}`;
  }
}

// "quinta-feira" -> "às quintas-feiras"; "sábado" -> "aos sábados"
function weekdayPhrase(weekday: string) {
  if (weekday === "sábado" || weekday === "domingo") return `aos ${weekday}s`;
  return `às ${weekday.replace("-feira", "s-feiras")}`;
}

export const hasEnded = (recurrence: Recurrence, today: string) =>
  recurrence.endDate !== null && recurrence.endDate < today;
