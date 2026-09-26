import type { CardsService } from '../cards/cards.service.js';
import type { CategoriesService } from '../categories/categories.service.js';
import { formatDate, parseDate } from '../common/date.js';
import { RecurrenceFrequency, TransactionType } from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { RecurrencesService } from './recurrences.service.js';

const recurrence = (id: number, timezone: string, overrides: object = {}) => ({
  id,
  userId: id,
  cardId: null,
  card: null,
  categoryId: null,
  name: `Recorrência ${id}`,
  description: null,
  amountInCents: 10000,
  type: TransactionType.OUTFLOW,
  frequency: RecurrenceFrequency.MONTHLY,
  interval: 1,
  startDate: parseDate('2026-08-27'),
  endDate: null,
  lastGeneratedDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { timezone },
  ...overrides,
});

describe('RecurrencesService.generateAllDue', () => {
  let service: RecurrencesService;
  let findMany: ReturnType<typeof vi.fn>;
  let createMany: ReturnType<typeof vi.fn>;
  let updateMany: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 01:30 UTC de 27/09: ainda é 26/09 em São Paulo, já é 27/09 em Tóquio
    vi.useFakeTimers({ now: new Date('2026-09-27T01:30:00Z') });
    findMany = vi.fn();
    createMany = vi.fn();
    updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = { recurrence: { updateMany }, transaction: { createMany } };
    const prisma = {
      recurrence: { findMany },
      $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    service = new RecurrencesService(
      prisma as unknown as PrismaService,
      {} as CardsService,
      {} as CategoriesService,
    );
  });

  afterEach(() => vi.useRealTimers());

  const generatedDates = () =>
    createMany.mock.calls.map(([{ data }]) => data.map((t: { date: Date }) => formatDate(t.date)));

  it('gera até o "hoje" do fuso de cada dono', async () => {
    findMany.mockResolvedValueOnce([recurrence(1, 'America/Sao_Paulo'), recurrence(2, 'Asia/Tokyo')]);

    const created = await service.generateAllDue();

    // Todo dia 27: em São Paulo o 27/09 ainda não chegou; em Tóquio, sim
    expect(generatedDates()).toEqual([['2026-08-27'], ['2026-08-27', '2026-09-27']]);
    expect(created).toBe(3);
  });

  it('continua de onde parou (lastGeneratedDate) e não repete o que já foi gerado', async () => {
    findMany.mockResolvedValueOnce([
      recurrence(1, 'Asia/Tokyo', { lastGeneratedDate: parseDate('2026-08-27') }),
      recurrence(2, 'Asia/Tokyo', { lastGeneratedDate: parseDate('2026-09-27') }),
    ]);

    expect(await service.generateAllDue()).toBe(1);
    expect(generatedDates()).toEqual([['2026-09-27']]);
  });

  it('não cria nada se outra execução já avançou a recorrência', async () => {
    findMany.mockResolvedValueOnce([recurrence(1, 'Asia/Tokyo')]);
    updateMany.mockResolvedValueOnce({ count: 0 });

    expect(await service.generateAllDue()).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('percorre as recorrências em lotes', async () => {
    findMany
      .mockResolvedValueOnce([recurrence(1, 'Asia/Tokyo'), recurrence(2, 'Asia/Tokyo')])
      .mockResolvedValueOnce([recurrence(3, 'Asia/Tokyo')]);

    await service.generateAllDue(2);

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany.mock.calls[1][0]).toMatchObject({ cursor: { id: 2 }, skip: 1 });
    expect(createMany).toHaveBeenCalledTimes(3);
  });
});
