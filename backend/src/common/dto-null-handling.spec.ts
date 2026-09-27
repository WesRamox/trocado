import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTransactionDto } from '../transactions/dto/create-transaction.dto.js';
import { UpdateTransactionDto } from '../transactions/dto/update-transaction.dto.js';

const errorsFor = async <T extends object>(cls: new () => T, body: object) =>
  (await validate(plainToInstance(cls, body))).map((error) => error.property);

describe('tratamento de null nos DTOs', () => {
  it('PATCH rejeita null em campo obrigatório', async () => {
    expect(await errorsFor(UpdateTransactionDto, { name: null, amount: null })).toEqual([
      'name',
      'amount',
    ]);
  });

  it('PATCH aceita null em campo opcional (para limpar)', async () => {
    expect(
      await errorsFor(UpdateTransactionDto, { description: null, cardId: null, categoryId: null }),
    ).toEqual([]);
  });

  it('PATCH aceita campos omitidos', async () => {
    expect(await errorsFor(UpdateTransactionDto, {})).toEqual([]);
  });

  it('campo opcional sem null (installments) rejeita null', async () => {
    const body = { name: 'X', amount: 10, type: 'OUTFLOW', date: '2026-09-01', installments: null };
    expect(await errorsFor(CreateTransactionDto, body)).toEqual(['installments']);
  });
});

describe('teto dos valores', () => {
  it('recusa valores acima de R$ 20 milhões (os centavos não cabem em Int)', async () => {
    const body = { name: 'X', type: 'OUTFLOW', date: '2026-09-01' };
    expect(await errorsFor(CreateTransactionDto, { ...body, amount: 20_000_000 })).toEqual([]);
    expect(await errorsFor(CreateTransactionDto, { ...body, amount: 300_001_000 })).toEqual(['amount']);
  });
});
