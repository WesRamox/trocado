import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateLoanDto } from './create-loan.dto.js';

// Valor, parcelas e datas não mudam: as parcelas já viraram lançamentos (exclua e crie de novo)
export class UpdateLoanDto extends PartialType(PickType(CreateLoanDto, ['name', 'received', 'categoryId'] as const), {
  skipNullProperties: false,
}) {}
