import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { toCents, toReais } from '../common/money.js';
import { isUniqueViolation } from '../common/prisma-errors.js';
import { TransactionType, type Category } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

export const toCategoryResponse = ({ userId: _userId, monthlyBudgetInCents, ...category }: Category) => ({
  ...category,
  monthlyBudget: monthlyBudgetInCents === null ? null : toReais(monthlyBudgetInCents),
});

// PATCH: undefined mantém o orçamento atual, null remove
const budgetInCents = (monthlyBudget: number | null | undefined) =>
  monthlyBudget === undefined || monthlyBudget === null ? monthlyBudget : toCents(monthlyBudget);

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, { name, type, color, icon, monthlyBudget }: CreateCategoryDto) {
    ensureBudgetAllowed(type, monthlyBudget);
    const category = await this.saveOrConflict(() =>
      this.prisma.category.create({
        data: { userId, name, type, color, icon, monthlyBudgetInCents: budgetInCents(monthlyBudget) },
      }),
    );
    return toCategoryResponse(category);
  }

  async findAll(userId: number, type?: TransactionType) {
    const categories = await this.prisma.category.findMany({
      where: { userId, type },
      orderBy: { name: 'asc' },
    });
    return categories.map(toCategoryResponse);
  }

  async findOne(userId: number, id: number) {
    return toCategoryResponse(await this.findEntity(userId, id));
  }

  async update(userId: number, id: number, { name, color, icon, monthlyBudget }: UpdateCategoryDto) {
    const current = await this.findEntity(userId, id);
    ensureBudgetAllowed(current.type, monthlyBudget);
    const category = await this.saveOrConflict(() =>
      this.prisma.category.update({
        where: { id },
        data: { name, color, icon, monthlyBudgetInCents: budgetInCents(monthlyBudget) },
      }),
    );
    return toCategoryResponse(category);
  }

  async remove(userId: number, id: number) {
    await this.findEntity(userId, id);
    // Os lançamentos continuam existindo, apenas sem categoria (onDelete: SetNull)
    await this.prisma.category.delete({ where: { id } });
  }

  async findEntity(userId: number, id: number): Promise<Category> {
    const category = await this.prisma.category.findFirst({ where: { id, userId } });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return category;
  }

  // Garante que a categoria é do usuário e do mesmo tipo do lançamento
  async ensureCompatible(userId: number, id: number, type: TransactionType) {
    const category = await this.findEntity(userId, id);
    if (category.type !== type) {
      throw new BadRequestException('A categoria não é do mesmo tipo do lançamento');
    }
  }

  private async saveOrConflict(save: () => Promise<Category>): Promise<Category> {
    try {
      return await save();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe uma categoria com esse nome e tipo');
      }
      throw error;
    }
  }
}

// Orçamento limita gastos: não faz sentido em categoria de entrada
function ensureBudgetAllowed(type: TransactionType, monthlyBudget: number | null | undefined) {
  if (type === TransactionType.INFLOW && monthlyBudget !== undefined && monthlyBudget !== null) {
    throw new BadRequestException('Orçamento só vale para categorias de saída');
  }
}
