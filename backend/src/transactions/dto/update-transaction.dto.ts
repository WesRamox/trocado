import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto.js';

// Edita um único lançamento (ou uma única parcela)
export class UpdateTransactionDto extends PartialType(
  OmitType(CreateTransactionDto, ['installments'] as const),
  { skipNullProperties: false },
) {}
