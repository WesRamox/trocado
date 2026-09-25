import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto.js';

// O tipo não pode mudar: deixaria inconsistentes os lançamentos que já usam a categoria
export class UpdateCategoryDto extends PartialType(OmitType(CreateCategoryDto, ['type'] as const), {
  skipNullProperties: false,
}) {}
