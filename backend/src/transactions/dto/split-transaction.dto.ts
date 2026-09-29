import { IsInt } from 'class-validator';
import { IsMoney } from '../../common/validators.js';

export class SplitTransactionDto {
  // Com quem dividir
  @IsInt()
  personId: number;

  // Parte da pessoa em reais, em cada parcela (o resto continua seu)
  @IsMoney()
  amount: number;
}
