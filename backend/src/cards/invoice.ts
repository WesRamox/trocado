import { addMonths, withDay } from '../common/date.js';
import { CardType, type Card } from '../generated/prisma/client.js';

// Vencimento da fatura em que entra uma compra feita em `date`.
// - Compras a partir do dia de fechamento entram na fatura seguinte.
// - O vencimento é o primeiro `dueDay` depois do fechamento.
// Ex.: fecha dia 3, vence dia 10 -> compra em 02/09 vence 10/09; compra em 03/09 vence 10/10.
export function invoiceDueDate(date: Date, closingDay: number, dueDay: number): Date {
  const closingThisMonth = withDay(date, closingDay);
  const closingDate =
    date < closingThisMonth ? closingThisMonth : withDay(addMonths(withDay(date, 1), 1), closingDay);

  const dueSameMonth = withDay(closingDate, dueDay);
  return dueSameMonth > closingDate
    ? dueSameMonth
    : withDay(addMonths(withDay(closingDate, 1), 1), dueDay);
}

// Vencimento da fatura para um lançamento; null se não houver cartão de crédito
export function invoiceDueDateFor(card: Card | null, date: Date): Date | null {
  if (card?.type !== CardType.CREDIT || card.closingDay === null || card.dueDay === null) {
    return null;
  }
  return invoiceDueDate(date, card.closingDay, card.dueDay);
}
