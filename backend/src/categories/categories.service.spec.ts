import { BadRequestException } from '@nestjs/common';
import { TransactionType, type Category } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { CategoriesService, toCategoryResponse } from './categories.service.js';

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  userId: 7,
  name: 'Mercado',
  type: TransactionType.OUTFLOW,
  color: null,
  icon: null,
  monthlyBudgetInCents: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('CategoriesService: orçamento mensal', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      category: {
        create: vi.fn(async ({ data }) => category(data)),
        update: vi.fn(async ({ data }) => category(data)),
        findFirst: vi.fn(),
      },
    };
    service = new CategoriesService(prisma as unknown as PrismaService);
  });

  it('guarda o orçamento em centavos e devolve em reais', async () => {
    const created = await service.create(7, { name: 'Mercado', type: TransactionType.OUTFLOW, monthlyBudget: 800.5 });

    expect(prisma.category.create.mock.calls[0][0].data.monthlyBudgetInCents).toBe(80050);
    expect(created.monthlyBudget).toBe(800.5);
    expect(created).not.toHaveProperty('monthlyBudgetInCents');
  });

  it('recusa orçamento em categoria de entrada', async () => {
    await expect(
      service.create(7, { name: 'Salário', type: TransactionType.INFLOW, monthlyBudget: 100 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('no PATCH, omitir mantém o orçamento e null remove', async () => {
    prisma.category.findFirst.mockResolvedValue(category({ monthlyBudgetInCents: 50000 }));

    await service.update(7, 1, { name: 'Feira' });
    expect(prisma.category.update.mock.calls[0][0].data.monthlyBudgetInCents).toBeUndefined();

    await service.update(7, 1, { monthlyBudget: null });
    expect(prisma.category.update.mock.calls[1][0].data.monthlyBudgetInCents).toBeNull();
  });

  it('no PATCH, recusa orçamento se a categoria existente for de entrada', async () => {
    prisma.category.findFirst.mockResolvedValue(category({ type: TransactionType.INFLOW }));

    await expect(service.update(7, 1, { monthlyBudget: 100 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('categoria sem orçamento responde monthlyBudget null', () => {
    expect(toCategoryResponse(category()).monthlyBudget).toBeNull();
  });
});
