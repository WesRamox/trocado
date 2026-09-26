import { IsNotEmpty, IsString, IsTimeZone, MaxLength } from 'class-validator';
import { IsOptionalNotNull } from '../../common/validators.js';

export class UpdateProfileDto {
  @IsOptionalNotNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  // Fuso IANA (ex.: America/Sao_Paulo): muda o "hoje" usado nas recorrências
  @IsOptionalNotNull()
  @IsTimeZone()
  timezone?: string;
}
