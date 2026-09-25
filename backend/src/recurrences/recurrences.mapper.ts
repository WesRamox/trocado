import { formatDate } from '../common/date.js';
import { toReais } from '../common/money.js';
import type { Recurrence } from '../generated/prisma/client.js';

export function toRecurrenceResponse({
  userId: _userId,
  amountInCents,
  startDate,
  endDate,
  lastGeneratedDate,
  ...recurrence
}: Recurrence) {
  return {
    ...recurrence,
    amount: toReais(amountInCents),
    startDate: formatDate(startDate),
    endDate: endDate && formatDate(endDate),
    lastGeneratedDate: lastGeneratedDate && formatDate(lastGeneratedDate),
  };
}
