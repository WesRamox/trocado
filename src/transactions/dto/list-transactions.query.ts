import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { IsMonth } from '../../common/validators.js';
import { TransactionType } from '../../generated/prisma/enums.js';

export class MonthQuery {
  // 'YYYY-MM'; padrão: mês atual
  @IsOptional()
  @IsMonth()
  month?: string;
}

export class ListTransactionsQuery extends MonthQuery {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cardId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;
}
