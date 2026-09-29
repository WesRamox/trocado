import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsDateOnly, IsMoney } from '../../common/validators.js';

export class CreateLoanDto {
  // Ex.: "Empréstimo Nubank"
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  // Quanto você vai pagar no total, em reais (as parcelas somadas, com juros)
  @IsMoney()
  total: number;

  @IsInt()
  @Min(1)
  @Max(120)
  installments: number;

  // Vencimento da 1ª parcela; as outras caem no mesmo dia dos meses seguintes
  @IsDateOnly()
  firstDueDate: string;

  // Quanto caiu na sua conta, em reais. Opcional: com ele, o app mostra os juros e a taxa
  @IsOptional()
  @IsMoney()
  received?: number | null;

  @IsOptional()
  @IsInt()
  categoryId?: number | null;
}
