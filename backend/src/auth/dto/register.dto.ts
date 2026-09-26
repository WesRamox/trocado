import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsTimeZone, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // limite do bcrypt
  password: string;

  // Fuso IANA do navegador (ex.: America/Sao_Paulo). Omitido: America/Sao_Paulo
  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}
