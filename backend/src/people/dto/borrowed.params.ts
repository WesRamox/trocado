import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { IsDateOnly, IsMonth } from '../../common/validators.js';

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
}
