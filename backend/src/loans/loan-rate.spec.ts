import { monthlyRate } from './loan-rate.js';

describe('monthlyRate', () => {
  it('acha a taxa da tabela Price', () => {
    // 10.000 em 12x de 1.000 -> ~2,92% ao mês
    expect(monthlyRate(10000, 1000, 12)).toBeCloseTo(0.02923, 4);
  });

  it('é zero quando as parcelas somam o que foi recebido', () => {
    expect(monthlyRate(1200, 100, 12)).toBe(0);
  });

  it('não calcula sem valor recebido', () => {
    expect(monthlyRate(0, 100, 12)).toBeNull();
  });
});
