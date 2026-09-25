import { addDays, addMonths } from '../common/date.js';
import { RecurrenceFrequency } from '../generated/prisma/enums.js';

interface Schedule {
  startDate: Date;
  frequency: RecurrenceFrequency;
  interval: number;
}

// A n-ésima ocorrência é sempre calculada a partir do início, para o dia não "escorregar"
// (começando em 31/01: 28/02, 31/03, 30/04... e não 28/02, 28/03, 28/04...)
export function nthOccurrence({ startDate, frequency, interval }: Schedule, n: number): Date {
  const steps = interval * n;
  switch (frequency) {
    case RecurrenceFrequency.DAILY:
      return addDays(startDate, steps);
    case RecurrenceFrequency.WEEKLY:
      return addDays(startDate, steps * 7);
    case RecurrenceFrequency.MONTHLY:
      return addMonths(startDate, steps);
    case RecurrenceFrequency.YEARLY:
      return addMonths(startDate, steps * 12);
  }
}

// Ocorrências depois de `after` (exclusivo) até `until` (inclusivo)
export function occurrencesBetween(schedule: Schedule, after: Date | null, until: Date): Date[] {
  const dates: Date[] = [];
  for (let n = 0; ; n++) {
    const date = nthOccurrence(schedule, n);
    if (date > until) {
      return dates;
    }
    if (!after || date > after) {
      dates.push(date);
    }
  }
}
