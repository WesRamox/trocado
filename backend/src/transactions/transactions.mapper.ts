import { formatDate } from '../common/date.js';
import { toReais } from '../common/money.js';
import type { Transaction } from '../generated/prisma/client.js';

export function toTransactionResponse({
  userId: _userId,
  amountInCents,
  date,
  invoiceDueDate,
  ...transaction
}: Transaction) {
  return {
    ...transaction,
    amount: toReais(amountInCents),
    date: formatDate(date),
    invoiceDueDate: invoiceDueDate && formatDate(invoiceDueDate),
  };
}
