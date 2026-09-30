import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_PAGE_SIZE } from '../../common/pagination.js';
import { IsMonth } from '../../common/validators.js';
import { TransactionType } from '../../generated/prisma/enums.js';

export class MonthQuery {
  // 'YYYY-MM'; padrão: mês atual
  @IsOptional()
  @IsMonth()
  month?: string;
}

// Intervalo de meses, inclusivo: from=2026-04&to=2026-09
export class MonthRangeQuery {
  @IsMonth()
  from: string;

  @IsMonth()
  to: string;
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

// Com `page`, a lista vem paginada ({ items, page, pageSize, totalItems, totalPages });
// sem ela, vem o mês inteiro como antes
export class FindTransactionsQuery extends ListTransactionsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}
