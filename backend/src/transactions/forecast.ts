import { invoiceDueDateFor } from '../cards/invoice.js';
import { addDays, formatDate } from '../common/date.js';
import { toReais } from '../common/money.js';
import type { Card, Recurrence } from '../generated/prisma/client.js';
import { occurrencesBetween } from '../recurrences/recurrence-schedule.js';

// Um lançamento previsto: a próxima ocorrência de uma recorrência, que ainda não virou lançamento.
// Tem o mesmo formato de um lançamento, sem id; quando o dia chega, o job cria o lançamento de
// verdade e a ocorrência deixa de ser prevista (a previsão começa depois de lastGeneratedDate).
export type RecurrenceWithCard = Recurrence & { card: Card | null };

export interface ForecastRange {
  start: Date;
  // Exclusivo
  end: Date;
  // 'date': pela data da ocorrência; 'invoice': pelo vencimento da fatura em que ela entra
  by: 'date' | 'invoice';
}

// Uma compra entra na fatura que vence até ~2 meses depois (fechamento + vencimento)
const INVOICE_LOOKBACK_DAYS = 70;

export function forecastOccurrences(recurrence: RecurrenceWithCard, { start, end, by }: ForecastRange) {
  const lastDay = addDays(end, -1);
  const until = recurrence.endDate && recurrence.endDate < lastDay ? recurrence.endDate : lastDay;
  const from = by === 'date' ? start : addDays(start, -INVOICE_LOOKBACK_DAYS);

  return occurrencesBetween(recurrence, recurrence.lastGeneratedDate, until)
    .filter((date) => date >= from)
    .map((date) => ({ date, invoiceDueDate: invoiceDueDateFor(recurrence.card, date) }))
    .filter(({ date, invoiceDueDate }) => {
      const key = by === 'date' ? date : invoiceDueDate;
      return key !== null && key >= start && key < end;
    })
    .map(({ date, invoiceDueDate }) => ({
      id: null,
      projected: true as const,
      recurrenceId: recurrence.id,
      cardId: recurrence.cardId,
      categoryId: recurrence.categoryId,
      personId: null,
      name: recurrence.name,
      description: recurrence.description,
      amount: toReais(recurrence.amountInCents),
      amountInCents: recurrence.amountInCents,
      type: recurrence.type,
      date: formatDate(date),
      invoiceDueDate: invoiceDueDate && formatDate(invoiceDueDate),
      invoiceRemainder: false,
      reimbursedAt: null,
      splitOfId: null,
      installmentNumber: null,
      installmentCount: null,
      installmentGroupId: null,
    }));
}

export type ForecastEntry = ReturnType<typeof forecastOccurrences>[number];

export const forecastFor = (recurrences: RecurrenceWithCard[], range: ForecastRange) =>
  recurrences
    .flatMap((recurrence) => forecastOccurrences(recurrence, range))
    .sort((a, b) => a.date.localeCompare(b.date) || a.recurrenceId - b.recurrenceId);
