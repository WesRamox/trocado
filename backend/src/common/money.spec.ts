import { splitCents, toCents, toReais } from './money.js';

describe('money', () => {
  it('converte reais para centavos sem erro de ponto flutuante', () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(1234.56)).toBe(123456);
  });

  it('converte centavos para reais', () => {
    expect(toReais(15075)).toBe(150.75);
    expect(toReais(5)).toBe(0.05);
  });

  it('divide o total e distribui os centavos que sobram nas primeiras parcelas', () => {
    expect(splitCents(1000, 3)).toEqual([334, 333, 333]);
    expect(splitCents(1000, 4)).toEqual([250, 250, 250, 250]);
    expect(splitCents(100001, 10).reduce((a, b) => a + b)).toBe(100001);
  });
});
