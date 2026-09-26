import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CardsService } from '../cards/cards.service.js';
import { invoiceDueDateFor } from '../cards/invoice.js';
import { CategoriesService } from '../categories/categories.service.js';
import { addMonths, currentMonth, formatDate, monthRange, monthsBetween, parseDate, withDay } from '../common/date.js';
import { splitCents, toCents, toReais } from '../common/money.js';
import { valueOrCurrent } from '../common/patch.js';
import { CardType, TransactionType, type Card, type Transaction } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { ListTransactionsQuery } from './dto/list-transactions.query.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { toTransactionResponse } from './transactions.mapper.js';

const MAX_HISTORY_MONTHS = 24;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cardsService: CardsService,
    private readonly categoriesService: CategoriesService,
    private readonly usersService: UsersService,
  ) {}

  // Sempre retorna uma lista: 1 lançamento, ou 1 por parcela
  async create(userId: number, dto: CreateTransactionDto) {
    const card = await this.resolveReferences(userId, dto.type, dto.cardId, dto.categoryId);

    const installments = dto.installments ?? 1;
    const totalCents = toCents(dto.amount);
    if (totalCents < installments) {
      throw new BadRequestException('Valor pequeno demais para o número de parcelas');
    }

    const firstDate = parseDate(dto.date);
    const firstInvoiceDueDate = invoiceDueDateFor(card, firstDate);
    const groupId = installments > 1 ? randomUUID() : null;

    const transactions = await this.prisma.transaction.createManyAndReturn({
      data: splitCents(totalCents, installments).map((amountInCents, i) => ({
        userId,
        name: dto.name,
        description: dto.description,
        amountInCents,
        type: dto.type,
        date: addMonths(firstDate, i),
        // Cada parcela cai na fatura seguinte à da anterior
        invoiceDueDate: firstInvoiceDueDate && addMonths(firstInvoiceDueDate, i),
        cardId: dto.cardId,
        categoryId: dto.categoryId,
        installmentNumber: groupId ? i + 1 : null,
        installmentCount: groupId ? installments : null,
        installmentGroupId: groupId,
      })),
    });
    return transactions.map(toTransactionResponse);
  }

  async findAll(userId: number, query: ListTransactionsQuery) {
    const { start, end } = monthRange(query.month ?? (await this.currentMonthOf(userId)));

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lt: end },
        type: query.type,
        cardId: query.cardId,
        categoryId: query.categoryId,
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
    return transactions.map(toTransactionResponse);
  }

  // Total de entradas, saídas e saldo do mês (pela data do lançamento)
  async summary(userId: number, month?: string) {
    month ??= await this.currentMonthOf(userId);
    const [summary] = await this.history(userId, month, month);
    return summary;
  }

  // Resumo de cada mês do intervalo (inclusivo), em uma única consulta
  async history(userId: number, from: string, to: string) {
    if (from > to) {
      throw new BadRequestException('from deve ser anterior ou igual a to');
    }
    const months = monthsBetween(from, to);
    if (months.length > MAX_HISTORY_MONTHS) {
      throw new BadRequestException(`O intervalo pode ter no máximo ${MAX_HISTORY_MONTHS} meses`);
    }

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: monthRange(from).start, lt: monthRange(to).end } },
      select: { date: true, type: true, amountInCents: true },
    });

    const totals = new Map(months.map((month) => [month, { inflow: 0, outflow: 0 }]));
    for (const { date, type, amountInCents } of transactions) {
      const total = totals.get(formatDate(date).slice(0, 7))!;
      if (type === TransactionType.INFLOW) total.inflow += amountInCents;
      else total.outflow += amountInCents;
    }

    return months.map((month) => {
      const { inflow, outflow } = totals.get(month)!;
      return {
        month,
        inflow: toReais(inflow),
        outflow: toReais(outflow),
        balance: toReais(inflow - outflow),
      };
    });
  }

  // Fatura de um cartão de crédito, pelo mês de vencimento
  async invoice(userId: number, cardId: number, month: string) {
    const card = await this.cardsService.findEntity(userId, cardId);
    if (card.type !== CardType.CREDIT || card.dueDay === null) {
      throw new BadRequestException('Apenas cartões de crédito têm fatura');
    }
    const { start, end } = monthRange(month);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, cardId, invoiceDueDate: { gte: start, lt: end } },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });
    // Entradas no cartão (estornos) abatem o total
    const totalCents = transactions.reduce(
      (sum, t) => sum + (t.type === TransactionType.OUTFLOW ? t.amountInCents : -t.amountInCents),
      0,
    );

    return {
      cardId,
      month,
      dueDate: formatDate(transactions[0]?.invoiceDueDate ?? withDay(start, card.dueDay)),
      total: toReais(totalCents),
      transactions: transactions.map(toTransactionResponse),
    };
  }

  async findOne(userId: number, id: number) {
    return toTransactionResponse(await this.findEntity(userId, id));
  }

  // Campos omitidos não mudam; description, cardId e categoryId aceitam null para limpar
  async update(userId: number, id: number, dto: UpdateTransactionDto) {
    const current = await this.findEntity(userId, id);
    const type = valueOrCurrent(dto.type, current.type);
    const cardId = valueOrCurrent(dto.cardId, current.cardId);
    const categoryId = valueOrCurrent(dto.categoryId, current.categoryId);
    const date = dto.date ? parseDate(dto.date) : current.date;

    const card = await this.resolveReferences(userId, type, cardId, categoryId);
    // A fatura só é recalculada se a data ou o cartão mudaram
    const invoiceChanged = dto.date !== undefined || dto.cardId !== undefined;

    const transaction = await this.prisma.transaction.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        amountInCents: dto.amount === undefined ? undefined : toCents(dto.amount),
        type,
        date,
        cardId,
        categoryId,
        invoiceDueDate: invoiceChanged ? invoiceDueDateFor(card, date) : undefined,
      },
    });
    return toTransactionResponse(transaction);
  }

  // Com allInstallments, remove todas as parcelas da mesma compra
  async remove(userId: number, id: number, allInstallments = false) {
    const transaction = await this.findEntity(userId, id);
    if (allInstallments && transaction.installmentGroupId) {
      await this.prisma.transaction.deleteMany({
        where: { userId, installmentGroupId: transaction.installmentGroupId },
      });
      return;
    }
    await this.prisma.transaction.delete({ where: { id } });
  }

  // Mês atual no fuso da pessoa (quando a consulta não informa o mês)
  private async currentMonthOf(userId: number) {
    return currentMonth(await this.usersService.timezoneOf(userId));
  }

  private async findEntity(userId: number, id: number): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!transaction) {
      throw new NotFoundException('Lançamento não encontrado');
    }
    return transaction;
  }

  // Garante que cartão e categoria são do usuário (e a categoria do mesmo tipo); retorna o cartão
  private async resolveReferences(
    userId: number,
    type: TransactionType,
    cardId?: number | null,
    categoryId?: number | null,
  ): Promise<Card | null> {
    if (categoryId) {
      await this.categoriesService.ensureCompatible(userId, categoryId, type);
    }
    return cardId ? this.cardsService.findEntity(userId, cardId) : null;
  }
}
