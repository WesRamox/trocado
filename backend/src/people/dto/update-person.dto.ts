import { PartialType } from '@nestjs/mapped-types';
import { CreatePersonDto } from './create-person.dto.js';

export class UpdatePersonDto extends PartialType(CreatePersonDto, { skipNullProperties: false }) {}
