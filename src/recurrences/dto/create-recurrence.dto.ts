import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsDateOnly, IsMoney, IsOptionalNotNull } from '../../common/validators.js';
import { RecurrenceFrequency, TransactionType } from '../../generated/prisma/enums.js';

export class CreateRecurrenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  // Valor de cada ocorrência, em reais
  @IsMoney()
  amount: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  // Repete a cada N períodos (ex.: MONTHLY + 3 = trimestral)
  @IsOptionalNotNull()
  @IsInt()
  @Min(1)
  @Max(365)
  interval?: number;

  // O dia das ocorrências segue o startDate
  @IsDateOnly()
  startDate: string;

  // Sem endDate, repete indefinidamente
  @IsOptional()
  @IsDateOnly()
  endDate?: string | null;

  @IsOptional()
  @IsInt()
  cardId?: number | null;

  @IsOptional()
  @IsInt()
  categoryId?: number | null;
}
