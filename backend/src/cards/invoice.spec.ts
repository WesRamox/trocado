import { formatDate, parseDate } from '../common/date.js';
import { invoiceDueDate } from './invoice.js';

const dueFor = (date: string, closingDay: number, dueDay: number) =>
  formatDate(invoiceDueDate(parseDate(date), closingDay, dueDay));

describe('invoiceDueDate', () => {
  it('compra antes do fechamento entra na fatura do mês', () => {
    expect(dueFor('2026-09-02', 3, 10)).toBe('2026-09-10');
  });

  it('compra no dia do fechamento ou depois entra na fatura seguinte', () => {
    expect(dueFor('2026-09-03', 3, 10)).toBe('2026-10-10');
    expect(dueFor('2026-09-20', 3, 10)).toBe('2026-10-10');
  });

  it('vencimento antes do dia de fechamento cai no mês seguinte ao fechamento', () => {
    // fecha dia 25, vence dia 5
    expect(dueFor('2026-09-10', 25, 5)).toBe('2026-10-05');
    expect(dueFor('2026-09-26', 25, 5)).toBe('2026-11-05');
  });

  it('vira o ano corretamente', () => {
    expect(dueFor('2026-12-28', 25, 5)).toBe('2027-02-05');
  });

  it('ajusta dias que não existem no mês', () => {
    // fecha dia 30, vence dia 7: em fevereiro fecha dia 28
    expect(dueFor('2026-02-27', 30, 7)).toBe('2026-03-07');
    expect(dueFor('2026-02-28', 30, 7)).toBe('2026-04-07');
  });
});
