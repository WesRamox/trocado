import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { IsMoney, IsOptionalNotNull } from '../../common/validators.js';
import { CardBrand, CardType } from '../../generated/prisma/enums.js';

export class CreateCardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsEnum(CardType)
  type: CardType;

  // Bandeira; OTHER quando não é nenhuma das listadas (padrão)
  @IsOptionalNotNull()
  @IsEnum(CardBrand)
  brand?: CardBrand;

  // Cor do cartão em hex; null volta para a cor automática
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color deve ser um hex, ex.: #2F63A8' })
  color?: string | null;

  @Matches(/^\d{4}$/, { message: 'lastFourDigits deve ter exatamente 4 dígitos' })
  lastFourDigits: string;

  // Obrigatórios para cartão de crédito; ignorados no débito
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  closingDay?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number | null;

  @IsOptional()
  @IsMoney()
  creditLimit?: number | null;
}
