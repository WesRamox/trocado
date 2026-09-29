import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional } from 'class-validator';
import { IsDateOnly, IsMonth, IsOptionalNotNull } from '../../common/validators.js';

export class BorrowedMonthParams {
  @Type(() => Number)
  @IsInt()
  personId: number;

  // Mês de cobrança, 'YYYY-MM': o do vencimento da fatura (ou da data, fora do crédito)
  @IsMonth()
  month: string;
}

export class MarkReceivedDto {
  // Dia em que a pessoa pagou
  @IsDateOnly()
  date: string;

  // Só estas compras do mês (ex.: as do dia 5); sem ids, todas
  @IsOptionalNotNull()
  @IsArray()
  @IsInt({ each: true })
  ids?: number[];
}

export class UnmarkReceivedQuery {
  // ?ids=1,2,3: só estas compras do mês; sem ids, todas
  @IsOptional()
  @Transform(({ value }: { value: string }) => value.split(',').map(Number))
  @IsInt({ each: true })
  ids?: number[];
}
