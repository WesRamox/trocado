import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { IsMoney } from '../../common/validators.js';
import { CardType } from '../../generated/prisma/enums.js';

export class CreateCardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsEnum(CardType)
  type: CardType;

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
