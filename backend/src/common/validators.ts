import { applyDecorators } from '@nestjs/common';
import { IsISO8601, IsNumber, IsPositive, Matches, Max, ValidateIf } from 'class-validator';

// Convenção dos DTOs:
// - @IsOptional()        -> campo pode ser omitido ou enviado como null (null limpa o valor)
// - @IsOptionalNotNull() -> campo pode ser omitido, mas null é rejeitado
export const IsOptionalNotNull = () => ValidateIf((_, value) => value !== undefined);

// Data no formato 'YYYY-MM-DD'
export const IsDateOnly = () =>
  applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '$property deve estar no formato YYYY-MM-DD' }),
    IsISO8601({ strict: true }),
  );

// Mês no formato 'YYYY-MM'
export const IsMonth = () =>
  Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: '$property deve estar no formato YYYY-MM' });

// Teto dos valores em reais: os centavos ficam em colunas Int (até ~R$ 21,4 milhões)
export const MAX_MONEY = 20_000_000;

// Valor em reais, positivo e com no máximo 2 casas decimais
export const IsMoney = () =>
  applyDecorators(
    IsNumber(
      { maxDecimalPlaces: 2 },
      { message: '$property deve ser um número com no máximo 2 casas decimais' },
    ),
    IsPositive({ message: '$property deve ser maior que zero' }),
    Max(MAX_MONEY, { message: '$property deve ser no máximo R$ 20.000.000,00' }),
  );
