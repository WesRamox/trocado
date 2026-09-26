import { formatDate, parseDate } from '../common/date.js';
import { RecurrenceFrequency } from '../generated/prisma/enums.js';
import { occurrencesBetween } from './recurrence-schedule.js';

const dates = (list: Date[]) => list.map(formatDate);

describe('occurrencesBetween', () => {
  it('mensal a partir do dia 31 não perde o dia nos meses seguintes', () => {
    const schedule = { startDate: parseDate('2026-01-31'), frequency: RecurrenceFrequency.MONTHLY, interval: 1 };
    expect(dates(occurrencesBetween(schedule, null, parseDate('2026-04-30')))).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('ignora ocorrências já geradas (até `after`)', () => {
    const schedule = { startDate: parseDate('2026-01-10'), frequency: RecurrenceFrequency.MONTHLY, interval: 1 };
    expect(
      dates(occurrencesBetween(schedule, parseDate('2026-02-10'), parseDate('2026-04-15'))),
    ).toEqual(['2026-03-10', '2026-04-10']);
  });

  it('respeita o intervalo (quinzenal)', () => {
    const schedule = { startDate: parseDate('2026-09-01'), frequency: RecurrenceFrequency.WEEKLY, interval: 2 };
    expect(dates(occurrencesBetween(schedule, null, parseDate('2026-09-30')))).toEqual([
      '2026-09-01',
      '2026-09-15',
      '2026-09-29',
    ]);
  });

  it('não retorna nada antes do início', () => {
    const schedule = { startDate: parseDate('2026-10-01'), frequency: RecurrenceFrequency.DAILY, interval: 1 };
    expect(occurrencesBetween(schedule, null, parseDate('2026-09-30'))).toEqual([]);
  });
});
