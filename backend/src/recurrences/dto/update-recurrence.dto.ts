import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateRecurrenceDto } from './create-recurrence.dto.js';

// Tipo, frequência e início não mudam: alterariam o sentido dos lançamentos já gerados.
// Para isso, encerre a recorrência (endDate) e crie outra.
export class UpdateRecurrenceDto extends PartialType(
  PickType(CreateRecurrenceDto, [
    'name',
    'description',
    'amount',
    'endDate',
    'cardId',
    'categoryId',
  ] as const),
  { skipNullProperties: false },
) {}
