import { IsNumber, Max, Min } from 'class-validator';
import { MAX_MONEY } from '../../common/validators.js';

export class SetInvoiceTotalDto {
  // Total da fatura em reais, como aparece no app do banco
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'total deve ser um número com no máximo 2 casas decimais' })
  @Min(0, { message: 'total não pode ser negativo' })
  @Max(MAX_MONEY, { message: 'total deve ser no máximo R$ 20.000.000,00' })
  total: number;
}
