import { PartialType } from '@nestjs/mapped-types';
import { CreateCardDto } from './create-card.dto.js';

// skipNullProperties: false -> null em campo obrigatório é rejeitado (em vez de chegar ao banco)
export class UpdateCardDto extends PartialType(CreateCardDto, { skipNullProperties: false }) {}
