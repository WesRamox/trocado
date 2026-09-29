import { Type } from 'class-transformer';
import { IsEnum } from 'class-validator';
import { IsDateOnly, IsMoney } from '../../common/validators.js';
import { TransactionType } from '../../generated/prisma/enums.js';

// Um lançamento prestes a ser criado: serve para achar a recorrência que ele talvez repita
export class RecurrenceMatchesQuery {
  @IsDateOnly()
  date: string;

  @Type(() => Number)
  @IsMoney()
  amount: number;

  @IsEnum(TransactionType)
  type: TransactionType;
}
