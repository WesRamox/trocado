import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { IsMonth } from '../../common/validators.js';

export class InvoiceParams {
  @Type(() => Number)
  @IsInt()
  cardId: number;

  // Mês de vencimento da fatura, 'YYYY-MM'
  @IsMonth()
  month: string;
}

export class InvoicePaymentParams extends InvoiceParams {
  @Type(() => Number)
  @IsInt()
  paymentId: number;
}
