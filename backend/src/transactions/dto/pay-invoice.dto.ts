import { IsDateOnly, IsMoney } from '../../common/validators.js';

export class PayInvoiceDto {
  // Valor pago em reais; pode ser só parte do que falta
  @IsMoney()
  amount: number;

  // Dia do pagamento
  @IsDateOnly()
  date: string;
}
