import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CardsService } from '../cards/cards.service.js';
import { invoiceDueDateFor, invoiceLastPurchaseDate } from '../cards/invoice.js';
import { CategoriesService } from '../categories/categories.service.js';
import {
  addDays,
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
import { DEFAULT_PAGE_SIZE, pageWindow, toPage } from '../common/pagination.js';
import { valueOrCurrent } from '../common/patch.js';
import { CardType, Prisma, TransactionType, type Card, type Transaction } from '../generated/prisma/client.js';
import { PeopleService } from '../people/people.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { FindTransactionsQuery, ListTransactionsQuery } from './dto/list-transactions.query.js';
import { PayInvoiceDto } from './dto/pay-invoice.dto.js';
import { RecurrenceMatchesQuery } from './dto/recurrence-matches.query.js';
import { SplitTransactionDto } from './dto/split-transaction.dto.js';
import { forecastFor, type ForecastEntry } from './forecast.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { toTransactionResponse } from './transactions.mapper.js';

const MAX_HISTORY_MONTHS = 24;

// Distância máxima (em dias) entre um lançamento novo e a ocorrência de recorrência que ele talvez repita
const RECURRENCE_MATCH_DAYS = 5;

// O centavo é só para as somas internas; a resposta tem o valor em reais, como os lançamentos
const toForecastResponse = ({ amountInCents: _amountInCents, ...entry }: ForecastEntry) => entry;

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

  async findAll(userId: number, query: FindTransactionsQuery) {
    const { start, end } = monthRange(query.month ?? (await this.currentMonthOf(userId)));
    const where: Prisma.TransactionWhereInput = {
      userId,
      date: { gte: start, lt: end },
      type: query.type,
      cardId: query.cardId,
      categoryId: query.categoryId,
    };
    const orderBy: Prisma.TransactionOrderByWithRelationInput[] = [{ date: 'desc' }, { id: 'desc' }];

    if (query.page === undefined) {
      const transactions = await this.prisma.transaction.findMany({ where, orderBy });
      return transactions.map(toTransactionResponse);
    }

    const { page, pageSize = DEFAULT_PAGE_SIZE } = query;
    const [transactions, totalItems] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({ where, orderBy, ...pageWindow(page, pageSize) }),
      this.prisma.transaction.count({ where }),
    ]);
    return toPage(transactions.map(toTransactionResponse), page, pageSize, totalItems);
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

    // Recorrências que ainda vão acontecer no período entram como previstas
    const forecast = forecastFor(await this.recurrencesOf(userId), {
      start: monthRange(from).start,
      end: monthRange(to).end,
      by: 'date',
    });

    const totals = new Map(
      months.map((month) => [month, { inflow: 0, outflow: 0, projectedInflow: 0, projectedOutflow: 0 }]),
    );
    for (const { date, type, amountInCents } of transactions) {
      const total = totals.get(formatDate(date).slice(0, 7))!;
      if (type === TransactionType.INFLOW) total.inflow += amountInCents;
      else total.outflow += amountInCents;
    }
    for (const { date, type, amountInCents } of forecast) {
      const total = totals.get(date.slice(0, 7))!;
      if (type === TransactionType.INFLOW) total.projectedInflow += amountInCents;
      else total.projectedOutflow += amountInCents;
    }

    return months.map((month) => {
      const { inflow, outflow, projectedInflow, projectedOutflow } = totals.get(month)!;
      // Os totais já contam o previsto; os campos projected* dizem quanto dele é previsão
      return {
        month,
        inflow: toReais(inflow + projectedInflow),
        outflow: toReais(outflow + projectedOutflow),
        balance: toReais(inflow + projectedInflow - outflow - projectedOutflow),
        projectedInflow: toReais(projectedInflow),
        projectedOutflow: toReais(projectedOutflow),
      };
    });
  }

  // Lançamentos previstos do mês (pela data): recorrências que ainda não viraram lançamento
  async forecast(userId: number, query: ListTransactionsQuery) {
    const range = monthRange(query.month ?? (await this.currentMonthOf(userId)));
    return forecastFor(await this.recurrencesOf(userId), { ...range, by: 'date' })
      .filter(
        (entry) =>
          (!query.type || entry.type === query.type) &&
          (!query.cardId || entry.cardId === query.cardId) &&
          (!query.categoryId || entry.categoryId === query.categoryId),
      )
      .map(toForecastResponse);
  }

  // Fluxo de caixa do mês: o dinheiro que entra e sai da conta, como numa planilha.
  // Diferente do resumo (que conta cada compra na data dela), aqui o cartão de crédito
  // entra pela fatura que vence no mês, e compras de outras pessoas entram pela fatura
  // inteira, com o reembolso delas como entrada.
  async cashflow(userId: number, month?: string) {
    month ??= await this.currentMonthOf(userId);
    const { start, end } = monthRange(month);
    const [cards, transactions, recurrences, borrowed] = await Promise.all([
      this.prisma.card.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
      this.prisma.transaction.findMany({ where: { userId, date: { gte: start, lt: end } } }),
      this.recurrencesOf(userId),
      this.peopleService.borrowed(userId, month),
    ]);
    const creditIds = new Set(cards.filter((card) => card.type === CardType.CREDIT).map((card) => card.id));
    // Fora do crédito (sem cartão ou no débito), o dinheiro sai ou entra no dia
    const outsideCredit = (t: { cardId: number | null }) => t.cardId === null || !creditIds.has(t.cardId);

    const invoices = await Promise.all([...creditIds].map((cardId) => this.invoice(userId, cardId, month)));
    const direct = transactions.filter(outsideCredit);
    const projected = forecastFor(recurrences, { start, end, by: 'date' }).filter(outsideCredit);

    const sumOf = (items: { amountInCents: number }[]) => items.reduce((sum, t) => sum + t.amountInCents, 0);
    const byType = (items: { type: TransactionType; amountInCents: number }[], type: TransactionType) =>
      sumOf(items.filter((t) => t.type === type));

    const incomeCents = byType(direct, TransactionType.INFLOW);
    const projectedIncomeCents = byType(projected, TransactionType.INFLOW);
    const otherOutflowCents = byType(direct, TransactionType.OUTFLOW);
    const projectedOtherOutflowCents = byType(projected, TransactionType.OUTFLOW);
    const invoicesCents = invoices.reduce((sum, invoice) => sum + toCents(invoice.total), 0);
    const projectedInvoicesCents = invoices.reduce((sum, invoice) => sum + toCents(invoice.projectedTotal), 0);
    const reimbursementsCents = toCents(borrowed.total);

    const inflowCents = incomeCents + projectedIncomeCents + reimbursementsCents;
    const outflowCents = invoicesCents + otherOutflowCents + projectedOtherOutflowCents;
    const cardName = new Map(cards.map((card) => [card.id, card.name]));

    return {
      month,
      inflow: toReais(inflowCents),
      outflow: toReais(outflowCents),
      balance: toReais(inflowCents - outflowCents),
      // Quanto dos totais ainda é previsão (recorrências que não chegaram no dia)
      projectedInflow: toReais(projectedIncomeCents),
      projectedOutflow: toReais(projectedOtherOutflowCents + projectedInvoicesCents),
      // Entradas: salário e outras (fora do crédito) + reembolsos de quem usou seus cartões
      income: toReais(incomeCents + projectedIncomeCents),
      reimbursements: toReais(reimbursementsCents),
      // Saídas: faturas que vencem no mês + contas pagas fora do cartão de crédito
      invoices: invoices
        .filter((invoice) => invoice.total !== 0)
        .map(({ cardId, dueDate, total }) => ({ cardId, name: cardName.get(cardId)!, dueDate, total })),
      invoicesTotal: toReais(invoicesCents),
      otherOutflow: toReais(otherOutflowCents + projectedOtherOutflowCents),
    };
  }

  // Recorrências que um lançamento novo talvez repita: mesmo tipo e valor, até
  // RECURRENCE_MATCH_DAYS dias de distância, já lançadas pela recorrência ou ainda previstas.
  // Evita contar em dobro algo que a recorrência já lança sozinha.
  async recurrenceMatches(userId: number, { date, amount, type }: RecurrenceMatchesQuery) {
    const day = parseDate(date);
    const start = addDays(day, -RECURRENCE_MATCH_DAYS);
    const end = addDays(day, RECURRENCE_MATCH_DAYS + 1);
    const amountInCents = toCents(amount);

    const [generated, recurrences] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, type, amountInCents, recurrenceId: { not: null }, date: { gte: start, lt: end } },
        include: { recurrence: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      this.recurrencesOf(userId),
    ]);
    const projected = forecastFor(recurrences, { start, end, by: 'date' }).filter(
      (entry) => entry.type === type && entry.amountInCents === amountInCents,
    );

    return [
      ...generated.map((t) => ({
        recurrenceId: t.recurrenceId!,
        name: t.recurrence?.name ?? t.name,
        date: formatDate(t.date),
        amount: toReais(t.amountInCents),
        projected: false,
      })),
      ...projected.map((entry) => ({
        recurrenceId: entry.recurrenceId,
        name: entry.name,
        date: entry.date,
        amount: entry.amount,
        projected: true,
      })),
    ];
  }

  private recurrencesOf(userId: number, cardId?: number) {
    return this.prisma.recurrence.findMany({ where: { userId, cardId }, include: { card: true } });
  }

  // Fatura de um cartão de crédito, pelo mês de vencimento
  async invoice(userId: number, cardId: number, month: string) {
    const card = await this.creditCardOf(userId, cardId);
    const { start, end } = monthRange(month);

    const where = { userId, cardId, invoiceDueDate: { gte: start, lt: end } };
    const [transactions, payments, recurrences] = await Promise.all([
      this.prisma.transaction.findMany({ where, orderBy: [{ date: 'asc' }, { id: 'asc' }] }),
      this.prisma.invoicePayment.findMany({ where, orderBy: [{ date: 'asc' }, { id: 'asc' }] }),
      this.recurrencesOf(userId, cardId),
    ]);
    // Recorrências no cartão que ainda vão cair nesta fatura. Com o total informado ("sem detalhe"),
    // ele já é o valor da fatura: somar a previsão contaria em dobro.
    const projected = transactions.some((t) => t.invoiceRemainder)
      ? []
      : forecastFor(recurrences, { start, end, by: 'invoice' });
    const projectedCents = signedTotalCents(projected);
    const totalCents = signedTotalCents(transactions) + projectedCents;
    const paidCents = payments.reduce((sum, p) => sum + p.amountInCents, 0);

    return {
      cardId,
      month,
      dueDate: formatDate(transactions[0]?.invoiceDueDate ?? withDay(start, card.dueDay!)),
      // Inclui o previsto; projectedTotal diz quanto dele é previsão
      total: toReais(totalCents),
      projectedTotal: toReais(projectedCents),
      projected: projected.map(toForecastResponse),
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

  // Divide uma compra com outra pessoa: cada parcela vira duas, a sua (o que sobra) e a da pessoa.
  // A fatura e o limite não mudam; só a parte da pessoa sai dos seus gastos. Devolve a parte dela.
  async split(userId: number, id: number, { personId, amount }: SplitTransactionDto) {
    const current = await this.findEntity(userId, id);
    if (current.type !== TransactionType.OUTFLOW || current.invoiceRemainder) {
      throw new BadRequestException('Só dá para dividir uma compra');
    }
    if (current.splitOfId !== null) {
      throw new BadRequestException('Este lançamento já é a parte de alguém: divida a compra original');
    }
    if (current.personId === personId) {
      throw new BadRequestException('A compra já é desta pessoa');
    }
    await this.peopleService.findEntity(userId, personId);

    const shareCents = toCents(amount);
    const originals = await this.prisma.transaction.findMany({
      where: current.installmentGroupId ? { userId, installmentGroupId: current.installmentGroupId } : { id },
      orderBy: { id: 'asc' },
    });
    if (originals.some((t) => shareCents >= t.amountInCents)) {
      throw new BadRequestException('A parte da pessoa precisa ser menor que o valor de cada parcela');
    }

    const groupId = current.installmentGroupId ? randomUUID() : null;
    const parts = await this.prisma.$transaction(async (tx) => {
      await tx.transaction.updateMany({
        where: { id: { in: originals.map((t) => t.id) } },
        data: { amountInCents: { decrement: shareCents } },
      });
      return tx.transaction.createManyAndReturn({
        data: originals.map((t) => ({
          userId,
          cardId: t.cardId,
          categoryId: t.categoryId,
          personId,
          name: t.name,
          description: t.description,
          amountInCents: shareCents,
          type: t.type,
          date: t.date,
          invoiceDueDate: t.invoiceDueDate,
          installmentNumber: t.installmentNumber,
          installmentCount: t.installmentCount,
          installmentGroupId: groupId,
          splitOfId: t.id,
        })),
      });
    });
    await this.settlePastCharges(userId, { id: { in: parts.map((t) => t.id) } });
    return this.findOne(userId, parts.find((t) => t.splitOfId === id)!.id);
  }

  // Desfaz a divisão a partir da parte da pessoa: o valor volta para as parcelas originais.
  // Devolve o lançamento original.
  async unsplit(userId: number, id: number) {
    const part = await this.findEntity(userId, id);
    if (part.splitOfId === null) {
      throw new BadRequestException('Este lançamento não é a parte de uma compra dividida');
    }
    const parts = await this.prisma.transaction.findMany({
      where: part.installmentGroupId ? { userId, installmentGroupId: part.installmentGroupId } : { id },
    });

    await this.prisma.$transaction(
      parts.flatMap((t) => [
        this.prisma.transaction.update({
          where: { id: t.splitOfId! },
          data: { amountInCents: { increment: t.amountInCents } },
        }),
        this.prisma.transaction.delete({ where: { id: t.id } }),
      ]),
    );
    return this.findOne(userId, part.splitOfId);
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
