import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { formatDate, monthRange, parseDate } from '../common/date.js';
import { toReais } from '../common/money.js';
import { isUniqueViolation } from '../common/prisma-errors.js';
import { TransactionType, type Person, type Transaction } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toTransactionResponse } from '../transactions/transactions.mapper.js';
import { CreatePersonDto } from './dto/create-person.dto.js';
import { UpdatePersonDto } from './dto/update-person.dto.js';

const toPersonResponse = ({ userId: _userId, ...person }: Person) => person;

// Compras do mês de cobrança: pela fatura que vence nele, ou pela data quando não há fatura
const chargeMonthWhere = (month: string) => {
  const { start, end } = monthRange(month);
  return {
    OR: [{ invoiceDueDate: { gte: start, lt: end } }, { invoiceDueDate: null, date: { gte: start, lt: end } }],
  };
};

// Estornos (entradas) abatem o que a pessoa deve
const signedCents = (t: Pick<Transaction, 'type' | 'amountInCents'>) =>
  t.type === TransactionType.OUTFLOW ? t.amountInCents : -t.amountInCents;

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, { name, color }: CreatePersonDto) {
    const person = await this.saveOrConflict(() => this.prisma.person.create({ data: { userId, name, color } }));
    return toPersonResponse(person);
  }

  async findAll(userId: number) {
    const people = await this.prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } });
    return people.map(toPersonResponse);
  }

  async update(userId: number, id: number, { name, color }: UpdatePersonDto) {
    await this.findEntity(userId, id);
    const person = await this.saveOrConflict(() => this.prisma.person.update({ where: { id }, data: { name, color } }));
    return toPersonResponse(person);
  }

  async remove(userId: number, id: number) {
    await this.findEntity(userId, id);
    // As compras voltam a ser suas (onDelete: SetNull)
    await this.prisma.$transaction([
      this.prisma.transaction.updateMany({ where: { userId, personId: id }, data: { reimbursedAt: null } }),
      this.prisma.person.delete({ where: { id } }),
    ]);
  }

  // Garante que a pessoa é do usuário. Usado também pelos lançamentos.
  async findEntity(userId: number, id: number): Promise<Person> {
    const person = await this.prisma.person.findFirst({ where: { id, userId } });
    if (!person) {
      throw new NotFoundException('Pessoa não encontrada');
    }
    return person;
  }

  // O que cada pessoa deve no mês de cobrança, e quanto ainda está em aberto no total
  // (inclusive parcelas dos próximos meses)
  async borrowed(userId: number, month: string) {
    const [people, monthItems, open] = await Promise.all([
      this.prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
      this.prisma.transaction.findMany({
        where: { userId, personId: { not: null }, ...chargeMonthWhere(month) },
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.transaction.findMany({
        where: { userId, personId: { not: null }, reimbursedAt: null },
        select: { personId: true, type: true, amountInCents: true },
      }),
    ]);

    const rows = people.map((person) => {
      const items = monthItems.filter((t) => t.personId === person.id);
      const totalCents = items.reduce((sum, t) => sum + signedCents(t), 0);
      const receivedCents = items.filter((t) => t.reimbursedAt).reduce((sum, t) => sum + signedCents(t), 0);
      const openCents = open.filter((t) => t.personId === person.id).reduce((sum, t) => sum + signedCents(t), 0);
      const receivedDates = items.flatMap((t) => (t.reimbursedAt ? [formatDate(t.reimbursedAt)] : []));
      return {
        person: toPersonResponse(person),
        total: toReais(totalCents),
        received: toReais(receivedCents),
        pending: toReais(totalCents - receivedCents),
        // Último dia em que algo deste mês foi recebido
        receivedAt: receivedDates.length > 0 ? receivedDates.sort().at(-1)! : null,
        open: toReais(openCents),
        items: items.map(toTransactionResponse),
      };
    });

    const sum = (key: 'total' | 'received' | 'pending' | 'open') =>
      toReais(rows.reduce((total, row) => total + Math.round(row[key] * 100), 0));
    return {
      month,
      total: sum('total'),
      received: sum('received'),
      pending: sum('pending'),
      open: sum('open'),
      people: rows,
    };
  }

  // A pessoa pagou o que devia no mês: marca as compras ainda não recebidas
  async markReceived(userId: number, personId: number, month: string, date: string) {
    await this.findEntity(userId, personId);
    await this.prisma.transaction.updateMany({
      where: { userId, personId, reimbursedAt: null, ...chargeMonthWhere(month) },
      data: { reimbursedAt: parseDate(date) },
    });
    return this.borrowed(userId, month);
  }

  async unmarkReceived(userId: number, personId: number, month: string) {
    await this.findEntity(userId, personId);
    await this.prisma.transaction.updateMany({
      where: { userId, personId, reimbursedAt: { not: null }, ...chargeMonthWhere(month) },
      data: { reimbursedAt: null },
    });
    return this.borrowed(userId, month);
  }

  private async saveOrConflict(save: () => Promise<Person>): Promise<Person> {
    try {
      return await save();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe uma pessoa com esse nome');
      }
      throw error;
    }
  }
}
