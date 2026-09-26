import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { toCents, toReais } from '../common/money.js';
import { valueOrCurrent } from '../common/patch.js';
import { CardType, type Card } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toCardResponse } from './cards.mapper.js';
import { CreateCardDto } from './dto/create-card.dto.js';
import { UpdateCardDto } from './dto/update-card.dto.js';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateCardDto) {
    const card = await this.prisma.card.create({ data: { userId, ...this.toData(dto) } });
    return toCardResponse(card);
  }

  async findAll(userId: number) {
    const cards = await this.prisma.card.findMany({ where: { userId }, orderBy: { name: 'asc' } });
    return cards.map(toCardResponse);
  }

  async findOne(userId: number, id: number) {
    return toCardResponse(await this.findEntity(userId, id));
  }

  async update(userId: number, id: number, dto: UpdateCardDto) {
    const current = await this.findEntity(userId, id);
    const currentCreditLimit =
      current.creditLimitInCents === null ? null : toReais(current.creditLimitInCents);
    const merged: CreateCardDto = {
      name: valueOrCurrent(dto.name, current.name),
      type: valueOrCurrent(dto.type, current.type),
      brand: valueOrCurrent(dto.brand, current.brand),
      color: valueOrCurrent(dto.color, current.color),
      lastFourDigits: valueOrCurrent(dto.lastFourDigits, current.lastFourDigits),
      closingDay: valueOrCurrent(dto.closingDay, current.closingDay),
      dueDay: valueOrCurrent(dto.dueDay, current.dueDay),
      creditLimit: valueOrCurrent(dto.creditLimit, currentCreditLimit),
    };
    const card = await this.prisma.card.update({ where: { id }, data: this.toData(merged) });
    return toCardResponse(card);
  }

  async remove(userId: number, id: number) {
    await this.findEntity(userId, id);
    // Os lançamentos vinculados continuam existindo, apenas sem cartão (onDelete: SetNull)
    await this.prisma.card.delete({ where: { id } });
  }

  // Busca um cartão do usuário ou lança 404. Usado também por outros módulos.
  async findEntity(userId: number, id: number): Promise<Card> {
    const card = await this.prisma.card.findFirst({ where: { id, userId } });
    if (!card) {
      throw new NotFoundException('Cartão não encontrado');
    }
    return card;
  }

  // Crédito exige fechamento e vencimento; débito não tem fechamento, vencimento nem limite
  private toData(dto: CreateCardDto) {
    const isCredit = dto.type === CardType.CREDIT;
    if (isCredit && (!dto.closingDay || !dto.dueDay)) {
      throw new BadRequestException('Cartão de crédito precisa de closingDay e dueDay');
    }
    return {
      name: dto.name,
      type: dto.type,
      brand: dto.brand,
      color: dto.color ?? null,
      lastFourDigits: dto.lastFourDigits,
      closingDay: isCredit ? (dto.closingDay ?? null) : null,
      dueDay: isCredit ? (dto.dueDay ?? null) : null,
      creditLimitInCents: isCredit && dto.creditLimit ? toCents(dto.creditLimit) : null,
    };
  }
}
