import { parseDate } from '../common/date.js';
import { CardBrand, CardType, RecurrenceFrequency, TransactionType } from '../generated/prisma/enums.js';
import { forecastOccurrences, type RecurrenceWithCard } from './forecast.js';

const recurrence = (overrides: Partial<RecurrenceWithCard> = {}): RecurrenceWithCard => ({
  id: 1,
  userId: 1,
  cardId: null,
  categoryId: null,
  name: 'Aluguel',
  description: null,
  amountInCents: 150000,
  type: TransactionType.OUTFLOW,
  frequency: RecurrenceFrequency.MONTHLY,
  interval: 1,
  startDate: parseDate('2026-01-10'),
  endDate: null,
  lastGeneratedDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  card: null,
  ...overrides,
});

const dates = (r: RecurrenceWithCard, from: string, to: string, by: 'date' | 'invoice' = 'date') =>
  forecastOccurrences(r, { start: parseDate(from), end: parseDate(to), by }).map((e) => e.date);

describe('forecastOccurrences', () => {
  it('prevê as ocorrências do período', () => {
    expect(dates(recurrence(), '2026-03-01', '2026-05-01')).toEqual(['2026-03-10', '2026-04-10']);
  });

  it('não prevê o que já virou lançamento (até lastGeneratedDate)', () => {
    const generated = recurrence({ lastGeneratedDate: parseDate('2026-03-10') });
    expect(dates(generated, '2026-03-01', '2026-05-01')).toEqual(['2026-04-10']);
  });

  it('para no fim da recorrência', () => {
    const ending = recurrence({ endDate: parseDate('2026-03-31') });
    expect(dates(ending, '2026-03-01', '2026-06-01')).toEqual(['2026-03-10']);
  });

  it('pela fatura, pega a ocorrência do mês anterior que vence no período', () => {
    const card = {
      id: 7,
      userId: 1,
      type: CardType.CREDIT,
      name: 'Nubank',
      lastFourDigits: '1234',
      brand: CardBrand.OTHER,
      color: null,
      closingDay: 3,
      dueDay: 10,
      creditLimitInCents: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const onCard = recurrence({ cardId: card.id, card });
    // Ocorrência de 10/03 fecha em 03/04 e vence em 10/04
    expect(dates(onCard, '2026-04-01', '2026-05-01', 'invoice')).toEqual(['2026-03-10']);
  });
});
