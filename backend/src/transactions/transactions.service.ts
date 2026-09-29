import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CardsService } from '../cards/cards.service.js';
import { invoiceDueDateFor, invoiceLastPurchaseDate } from '../cards/invoice.js';
import { CategoriesService } from '../categories/categories.service.js';
import {
  addMonths,
  currentMonth,
  formatDate,
  monthRange,
  monthsBetween,
  parseDate,
  today,
  withDay,
} from '../common/date.js';
import { formatCents, splitCents, toCents, toReais } from '../common/money.js';
import { valueOrCurrent } from '../common/patch.js';
import { CardType, Prisma, TransactionType, type Card, type Transaction } from '../generated/prisma/client.js';
import { PeopleService } from '../people/people.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { ListTransactionsQuery } from './dto/list-transactions.query.js';
import { PayInvoiceDto } from './dto/pay-invoice.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { toTransactionResponse } from './transactions.mapper.js';

const MAX_HISTORY_MONTHS = 24;

// Soma de uma fatura: entradas no cartão (estornos) abatem o total
const signedTotalCents = (items: Pick<Transaction, 'type' | 'amountInCents'>[]) =>
  items.reduce((sum, t) => sum + (t.type === TransactionType.OUTFLOW ? t.amountInCents : -t.amountInCents), 0);

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cardsService: CardsService,
    private readonly categoriesService: CategoriesService,
    private readonly peopleService: PeopleService,
    private readonly usersService: UsersService,
  ) {}

  // Sempre retorna uma lista: 1 lançamento, ou 1 por parcela
  async create(userId: number, dto: CreateTransactionDto) {
    const card = await this.resolveReferences(userId, dto.type, dto.cardId, dto.categoryId, dto.personId);

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
        personId: dto.personId,
        installmentNumber: groupId ? i + 1 : null,
        installmentCount: groupId ? installments : null,
        installmentGroupId: groupId,
      })),
    });
    if (dto.personId) {
      const ids = transactions.map((t) => t.id);
      await this.settlePastCharges(userId, { id: { in: ids } });
      const settled = await this.prisma.transaction.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } });
      return settled.map(toTransactionResponse);
    }
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
      // Compras de outras pessoas nos seus cartões não são gastos seus
      where: { userId, personId: null, date: { gte: monthRange(from).start, lt: monthRange(to).end } },
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
    const card = await this.creditCardOf(userId, cardId);
    const { start, end } = monthRange(month);

    const where = { userId, cardId, invoiceDueDate: { gte: start, lt: end } };
    const [transactions, payments] = await Promise.all([
      this.prisma.transaction.findMany({ where, orderBy: [{ date: 'asc' }, { id: 'asc' }] }),
      this.prisma.invoicePayment.findMany({ where, orderBy: [{ date: 'asc' }, { id: 'asc' }] }),
    ]);
    const totalCents = signedTotalCents(transactions);
    const paidCents = payments.reduce((sum, p) => sum + p.amountInCents, 0);

    return {
      cardId,
      month,
      dueDate: formatDate(transactions[0]?.invoiceDueDate ?? withDay(start, card.dueDay!)),
      total: toReais(totalCents),
      paid: toReais(paidCents),
      // Pago a mais (ex.: compra excluída depois do pagamento) não vira saldo negativo
      remaining: toReais(Math.max(totalCents - paidCents, 0)),
      payments: payments.map(({ id, amountInCents, date }) => ({
        id,
        amount: toReais(amountInCents),
        date: formatDate(date),
      })),
      transactions: transactions.map(toTransactionResponse),
    };
  }

  // Registra um pagamento (total ou parcial) da fatura; devolve a fatura atualizada.
  // Não é um gasto novo: só libera o limite e abate o que falta pagar.
  async payInvoice(userId: number, cardId: number, month: string, dto: PayInvoiceDto) {
    const invoice = await this.invoice(userId, cardId, month);
    const amountCents = toCents(dto.amount);
    const remainingCents = toCents(invoice.remaining);
    if (remainingCents === 0) {
      throw new BadRequestException('Esta fatura já está paga');
    }
    if (amountCents > remainingCents) {
      throw new BadRequestException(`O pagamento não pode passar dos ${formatCents(remainingCents)} que faltam`);
    }

    await this.prisma.invoicePayment.create({
      data: {
        userId,
        cardId,
        invoiceDueDate: parseDate(invoice.dueDate),
        amountInCents: amountCents,
        date: parseDate(dto.date),
      },
    });
    return this.invoice(userId, cardId, month);
  }

  async removeInvoicePayment(userId: number, cardId: number, month: string, paymentId: number) {
    await this.creditCardOf(userId, cardId);
    const { start, end } = monthRange(month);
    const { count } = await this.prisma.invoicePayment.deleteMany({
      where: { id: paymentId, userId, cardId, invoiceDueDate: { gte: start, lt: end } },
    });
    if (count === 0) {
      throw new NotFoundException('Pagamento não encontrado');
    }
  }

  // Limite em uso: uma compra ocupa o limite pelo valor total (todas as parcelas, inclusive as
  // de faturas futuras) até as faturas serem pagas.
  async creditLimit(userId: number, cardId: number) {
    const card = await this.creditCardOf(userId, cardId);
    const [transactions, payments] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, cardId, invoiceDueDate: { not: null } },
        select: { type: true, amountInCents: true },
      }),
      this.prisma.invoicePayment.aggregate({ where: { userId, cardId }, _sum: { amountInCents: true } }),
    ]);
    const usedCents = Math.max(signedTotalCents(transactions) - (payments._sum.amountInCents ?? 0), 0);
    const limitCents = card.creditLimitInCents;

    return {
      cardId,
      limit: limitCents === null ? null : toReais(limitCents),
      used: toReais(usedCents),
      available: limitCents === null ? null : toReais(limitCents - usedCents),
    };
  }

  // Informa só o total da fatura, sem os itens. A diferença para o que já está lançado nela
  // (recorrências, compras detalhadas) vira um lançamento "sem detalhe" (invoiceRemainder),
  // para nada ser contado em dobro. Informar de novo recalcula essa diferença.
  async setInvoiceTotal(userId: number, cardId: number, month: string, total: number) {
    const card = await this.creditCardOf(userId, cardId);
    const { start, end } = monthRange(month);
    const dueDate = withDay(start, card.dueDay!);
    // O lançamento fica no último dia de compras do ciclo, então cai exatamente nesta fatura
    const date = invoiceLastPurchaseDate(dueDate, card.closingDay!);
    if (formatDate(invoiceDueDateFor(card, date)!) !== formatDate(dueDate)) {
      // Ex.: fecha dia 28 e vence dia 29: em fevereiro os dois viram 28/02 e não há fatura
      throw new BadRequestException(`Este cartão não tem fatura com vencimento em ${month}`);
    }

    await this.prisma.$transaction(async (tx) => {
      const items = await tx.transaction.findMany({
        where: { userId, cardId, invoiceDueDate: { gte: start, lt: end } },
      });
      const remainder = items.find((t) => t.invoiceRemainder);
      const detailedCents = signedTotalCents(items.filter((t) => !t.invoiceRemainder));
      const remainderCents = toCents(total) - detailedCents;

      if (remainderCents < 0) {
        throw new BadRequestException(
          `O total não pode ser menor que os ${formatCents(detailedCents)} já lançados nesta fatura`,
        );
      }
      if (remainderCents === 0) {
        if (remainder) await tx.transaction.delete({ where: { id: remainder.id } });
        return;
      }
      if (remainder) {
        await tx.transaction.update({ where: { id: remainder.id }, data: { amountInCents: remainderCents } });
        return;
      }
      await tx.transaction.create({
        data: {
          userId,
          cardId,
          name: `Fatura ${card.name} (sem detalhe)`,
          amountInCents: remainderCents,
          type: TransactionType.OUTFLOW,
          date,
          invoiceDueDate: dueDate,
          invoiceRemainder: true,
        },
      });
    });
    return this.invoice(userId, cardId, month);
  }

  // Remove o valor "sem detalhe" da fatura (os itens lançados continuam)
  async removeInvoiceRemainder(userId: number, cardId: number, month: string) {
    await this.creditCardOf(userId, cardId);
    const { start, end } = monthRange(month);
    await this.prisma.transaction.deleteMany({
      where: { userId, cardId, invoiceRemainder: true, invoiceDueDate: { gte: start, lt: end } },
    });
  }

  async findOne(userId: number, id: number) {
    return toTransactionResponse(await this.findEntity(userId, id));
  }

  // Campos omitidos não mudam; description, cardId e categoryId aceitam null para limpar
  async update(userId: number, id: number, dto: UpdateTransactionDto) {
    const current = await this.findEntity(userId, id);
    if (current.invoiceRemainder) {
      throw new BadRequestException('Este valor vem do total informado da fatura: ajuste o total pelo cartão');
    }
    const type = valueOrCurrent(dto.type, current.type);
    const cardId = valueOrCurrent(dto.cardId, current.cardId);
    const categoryId = valueOrCurrent(dto.categoryId, current.categoryId);
    const personId = valueOrCurrent(dto.personId, current.personId);
    const date = dto.date ? parseDate(dto.date) : current.date;

    const card = await this.resolveReferences(userId, type, cardId, categoryId, personId);
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
    if (personId !== current.personId) {
      // De quem é vale para a compra toda: todas as parcelas mudam juntas, e o reembolso recomeça
      const purchase = current.installmentGroupId ? { userId, installmentGroupId: current.installmentGroupId } : { id };
      await this.prisma.transaction.updateMany({ where: purchase, data: { personId, reimbursedAt: null } });
      if (personId) await this.settlePastCharges(userId, purchase);
      return this.findOne(userId, id);
    }
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

  private async creditCardOf(userId: number, cardId: number): Promise<Card> {
    const card = await this.cardsService.findEntity(userId, cardId);
    if (card.type !== CardType.CREDIT || card.dueDay === null || card.closingDay === null) {
      throw new BadRequestException('Apenas cartões de crédito têm fatura');
    }
    return card;
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
  // Ao marcar uma compra como de outra pessoa, as parcelas de faturas que já venceram contam como
  // reembolsadas no vencimento (a pessoa paga no dia do pagamento). Só as próximas ficam a receber.
  private async settlePastCharges(userId: number, where: Prisma.TransactionWhereInput) {
    const todayDate = today(await this.usersService.timezoneOf(userId));
    const items = await this.prisma.transaction.findMany({
      where: { ...where, userId },
      select: { id: true, date: true, invoiceDueDate: true },
    });
    const past = items.filter((t) => (t.invoiceDueDate ?? t.date) < todayDate);
    await this.prisma.$transaction(
      past.map((t) =>
        this.prisma.transaction.update({ where: { id: t.id }, data: { reimbursedAt: t.invoiceDueDate ?? t.date } }),
      ),
    );
  }

  private async resolveReferences(
    userId: number,
    type: TransactionType,
    cardId?: number | null,
    categoryId?: number | null,
    personId?: number | null,
  ): Promise<Card | null> {
    if (categoryId) {
      await this.categoriesService.ensureCompatible(userId, categoryId, type);
    }
    if (personId) {
      await this.peopleService.findEntity(userId, personId);
    }
    return cardId ? this.cardsService.findEntity(userId, cardId) : null;
  }
}
