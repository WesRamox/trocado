import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { IsMoney } from '../../common/validators.js';
import { TransactionType } from '../../generated/prisma/enums.js';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  // Se a categoria é de entrada (INFLOW) ou saída (OUTFLOW)
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color deve ser um hex, ex.: #FF8800' })
  color?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string | null;

  // Limite de gastos por mês, em reais. Só para categorias de saída; null remove o orçamento
  @IsOptional()
  @IsMoney()
  monthlyBudget?: number | null;
}
