import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CategoriesService } from '../categories/categories.service.js';
import { addMonths, formatDate, parseDate, today } from '../common/date.js';
import { splitCents, toCents, toReais } from '../common/money.js';
import { TransactionType, type Loan, type Transaction } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { UpdateLoanDto } from './dto/update-loan.dto.js';
import { monthlyRate } from './loan-rate.js';

type LoanWithInstallments = Loan & { transactions: Pick<Transaction, 'date' | 'amountInCents'>[] };

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
    private readonly usersService: UsersService,
  ) {}

  // Cria o empréstimo e as parcelas, uma por mês, como lançamentos de saída
  async create(userId: number, dto: CreateLoanDto) {
    if (dto.categoryId) {
      await this.categoriesService.ensureCompatible(userId, dto.categoryId, TransactionType.OUTFLOW);
    }
    const firstDueDate = parseDate(dto.firstDueDate);
    const groupId = dto.installments > 1 ? randomUUID() : null;

    const loan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.loan.create({
        data: {
          userId,
          name: dto.name,
          totalInCents: toCents(dto.total),
          installments: dto.installments,
          firstDueDate,
          receivedInCents: dto.received ? toCents(dto.received) : null,
          categoryId: dto.categoryId,
        },
      });
      await tx.transaction.createMany({
        data: splitCents(created.totalInCents, dto.installments).map((amountInCents, i) => ({
          userId,
          loanId: created.id,
          categoryId: dto.categoryId,
          name: dto.name,
          amountInCents,
          type: TransactionType.OUTFLOW,
          date: addMonths(firstDueDate, i),
          installmentNumber: groupId ? i + 1 : null,
          installmentCount: groupId ? dto.installments : null,
          installmentGroupId: groupId,
        })),
      });
      return created;
    });
    return this.findOne(userId, loan.id);
  }

  async findAll(userId: number) {
    const [loans, todayDate] = await Promise.all([
      this.prisma.loan.findMany({
        where: { userId },
        include: { transactions: { select: { date: true, amountInCents: true }, orderBy: { date: 'asc' } } },
        orderBy: { firstDueDate: 'asc' },
      }),
      this.todayOf(userId),
    ]);
    return loans.map((loan) => toLoanResponse(loan, todayDate));
  }

  async findOne(userId: number, id: number) {
    const [loan, todayDate] = await Promise.all([this.findEntity(userId, id), this.todayOf(userId)]);
    return toLoanResponse(loan, todayDate);
  }

  // Nome e categoria valem também para as parcelas
  async update(userId: number, id: number, dto: UpdateLoanDto) {
    await this.findEntity(userId, id);
    if (dto.categoryId) {
      await this.categoriesService.ensureCompatible(userId, dto.categoryId, TransactionType.OUTFLOW);
    }
    await this.prisma.$transaction([
      this.prisma.loan.update({
        where: { id },
        data: {
          name: dto.name,
          categoryId: dto.categoryId,
          receivedInCents: dto.received === undefined ? undefined : dto.received && toCents(dto.received),
        },
      }),
      this.prisma.transaction.updateMany({
        where: { userId, loanId: id },
        data: { name: dto.name, categoryId: dto.categoryId },
      }),
    ]);
    return this.findOne(userId, id);
  }

  // As parcelas vão junto (onDelete: Cascade)
  async remove(userId: number, id: number) {
    await this.findEntity(userId, id);
    await this.prisma.loan.delete({ where: { id } });
  }

  private async findEntity(userId: number, id: number): Promise<LoanWithInstallments> {
    const loan = await this.prisma.loan.findFirst({
      where: { id, userId },
      include: { transactions: { select: { date: true, amountInCents: true }, orderBy: { date: 'asc' } } },
    });
    if (!loan) {
      throw new NotFoundException('Empréstimo não encontrado');
    }
    return loan;
  }

  private async todayOf(userId: number) {
    return today(await this.usersService.timezoneOf(userId));
  }
}

// As parcelas são debitadas no vencimento: as que já venceram contam como pagas
function toLoanResponse({ userId: _userId, transactions, ...loan }: LoanWithInstallments, todayDate: Date) {
  const paid = transactions.filter((t) => t.date <= todayDate);
  const open = transactions.filter((t) => t.date > todayDate);
  const sum = (list: typeof transactions) => list.reduce((total, t) => total + t.amountInCents, 0);
  const installmentCents = transactions[0]?.amountInCents ?? 0;
  const { receivedInCents, totalInCents } = loan;

  return {
    id: loan.id,
    name: loan.name,
    categoryId: loan.categoryId,
    total: toReais(totalInCents),
    installments: loan.installments,
    installmentAmount: toReais(installmentCents),
    firstDueDate: formatDate(loan.firstDueDate),
    lastDueDate: formatDate(transactions.at(-1)?.date ?? loan.firstDueDate),
    received: receivedInCents === null ? null : toReais(receivedInCents),
    // Juros: o que você paga a mais do que recebeu
    interest: receivedInCents === null ? null : toReais(totalInCents - receivedInCents),
    monthlyRate: receivedInCents === null ? null : monthlyRate(receivedInCents, installmentCents, loan.installments),
    paidCount: paid.length,
    paid: toReais(sum(paid)),
    // Saldo devedor: as parcelas que ainda vão vencer
    remaining: toReais(sum(open)),
    nextDueDate: open[0] ? formatDate(open[0].date) : null,
  };
}
