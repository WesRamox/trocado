import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsDateOnly, IsMoney, IsOptionalNotNull } from '../../common/validators.js';
import { TransactionType } from '../../generated/prisma/enums.js';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  // Valor total em reais. Se parcelado, é dividido entre as parcelas.
  @IsMoney()
  amount: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  // Data do lançamento (da 1ª parcela, se parcelado)
  @IsDateOnly()
  date: string;

  @IsOptional()
  @IsInt()
  cardId?: number | null;

  @IsOptional()
  @IsInt()
  categoryId?: number | null;

  // De quem é a compra, quando outra pessoa usou seu cartão; null = sua
  @IsOptional()
  @IsInt()
  personId?: number | null;

  // Número de parcelas; cada parcela cai um mês depois da anterior
  @IsOptionalNotNull()
  @IsInt()
  @Min(1)
  @Max(120)
  installments?: number;
}
