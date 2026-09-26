import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CardsService } from '../cards/cards.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { parseDate, parseOptionalDate, today } from '../common/date.js';
import { invoiceDueDateFor } from '../cards/invoice.js';
import { toCents } from '../common/money.js';
import type { Card, Recurrence, TransactionType } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRecurrenceDto } from './dto/create-recurrence.dto.js';
import { UpdateRecurrenceDto } from './dto/update-recurrence.dto.js';
import { occurrencesBetween } from './recurrence-schedule.js';
import { toRecurrenceResponse } from './recurrences.mapper.js';

@Injectable()
export class RecurrencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cardsService: CardsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(userId: number, dto: CreateRecurrenceDto) {
    await this.validateReferences(userId, dto.type, dto.cardId, dto.categoryId);
    const startDate = parseDate(dto.startDate);
    const endDate = dto.endDate ? parseDate(dto.endDate) : null;
    this.ensureValidPeriod(startDate, endDate);

    const recurrence = await this.prisma.recurrence.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        amountInCents: toCents(dto.amount),
        type: dto.type,
        frequency: dto.frequency,
        interval: dto.interval,
        startDate,
        endDate,
        cardId: dto.cardId,
        categoryId: dto.categoryId,
      },
    });
    return toRecurrenceResponse(await this.generateNow(recurrence.id));
  }

  async findAll(userId: number) {
    const recurrences = await this.prisma.recurrence.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return recurrences.map(toRecurrenceResponse);
  }

  async findOne(userId: number, id: number) {
    return toRecurrenceResponse(await this.findEntity(userId, id));
  }

  // Afeta só as próximas ocorrências; lançamentos já gerados não mudam
  async update(userId: number, id: number, dto: UpdateRecurrenceDto) {
    const current = await this.findEntity(userId, id);
    await this.validateReferences(userId, current.type, dto.cardId, dto.categoryId);
    const endDate = parseOptionalDate(dto.endDate);
    if (endDate) {
      this.ensureValidPeriod(current.startDate, endDate);
    }

    await this.prisma.recurrence.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        amountInCents: dto.amount === undefined ? undefined : toCents(dto.amount),
        endDate,
        cardId: dto.cardId,
        categoryId: dto.categoryId,
      },
    });
    return toRecurrenceResponse(await this.generateNow(id));
  }

  async remove(userId: number, id: number) {
    await this.findEntity(userId, id);
    // Os lançamentos já gerados continuam existindo (onDelete: SetNull)
    await this.prisma.recurrence.delete({ where: { id } });
  }

  // Gera os lançamentos que já venceram de todas as recorrências, cada uma no "hoje" do fuso
  // do seu dono. Chamado pelo job de hora em hora (RecurrencesScheduler). Devolve quantos criou.
  async generateAllDue(batchSize = 500): Promise<number> {
    // Nenhum fuso está mais adiantado que UTC+14: recorrências que começam depois disso ainda não venceram
    const latestToday = today('Pacific/Kiritimati');
    let created = 0;
    let cursor: number | undefined;
    for (;;) {
      const batch = await this.prisma.recurrence.findMany({
        where: { startDate: { lte: latestToday } },
        include: { card: true, user: { select: { timezone: true } } },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor !== undefined && { skip: 1, cursor: { id: cursor } }),
      });
      for (const recurrence of batch) {
        created += await this.generateFor(recurrence, today(recurrence.user.timezone));
      }
      if (batch.length < batchSize) return created;
      cursor = batch.at(-1)!.id;
    }
  }

  // Gera na hora o que já venceu (ex.: recorrência que começa hoje ou no passado) e devolve
  // a recorrência atualizada, sem esperar o próximo job
  private async generateNow(id: number): Promise<Recurrence> {
    const recurrence = await this.prisma.recurrence.findUniqueOrThrow({
      where: { id },
      include: { card: true, user: { select: { timezone: true } } },
    });
    await this.generateFor(recurrence, today(recurrence.user.timezone));
    return this.prisma.recurrence.findUniqueOrThrow({ where: { id } });
  }

  // Devolve quantos lançamentos criou
  private async generateFor(recurrence: Recurrence & { card: Card | null }, today: Date): Promise<number> {
    const until = recurrence.endDate && recurrence.endDate < today ? recurrence.endDate : today;
    const dates = occurrencesBetween(recurrence, recurrence.lastGeneratedDate, until);
    if (dates.length === 0) {
      return 0;
    }

    return this.prisma.$transaction(async (tx) => {
      // Só avança se nenhuma outra execução gerou antes (evita lançamentos duplicados)
      const { count } = await tx.recurrence.updateMany({
        where: { id: recurrence.id, lastGeneratedDate: recurrence.lastGeneratedDate },
        data: { lastGeneratedDate: dates.at(-1) },
      });
      if (count === 0) {
        return 0;
      }

      await tx.transaction.createMany({
        data: dates.map((date) => ({
          userId: recurrence.userId,
          recurrenceId: recurrence.id,
          cardId: recurrence.cardId,
          categoryId: recurrence.categoryId,
          name: recurrence.name,
          description: recurrence.description,
          amountInCents: recurrence.amountInCents,
          type: recurrence.type,
          date,
          invoiceDueDate: invoiceDueDateFor(recurrence.card, date),
        })),
      });
      return dates.length;
    });
  }

  private async findEntity(userId: number, id: number): Promise<Recurrence> {
    const recurrence = await this.prisma.recurrence.findFirst({ where: { id, userId } });
    if (!recurrence) {
      throw new NotFoundException('Recorrência não encontrada');
    }
    return recurrence;
  }

  private async validateReferences(
    userId: number,
    type: TransactionType,
    cardId?: number | null,
    categoryId?: number | null,
  ) {
    if (cardId) {
      await this.cardsService.findEntity(userId, cardId);
    }
    if (categoryId) {
      await this.categoriesService.ensureCompatible(userId, categoryId, type);
    }
  }

  private ensureValidPeriod(startDate: Date, endDate: Date | null) {
    if (endDate && endDate < startDate) {
      throw new BadRequestException('endDate deve ser igual ou posterior a startDate');
    }
  }
}
