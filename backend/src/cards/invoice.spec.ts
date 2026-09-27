import { addDays, formatDate, parseDate } from '../common/date.js';
import { invoiceDueDate, invoiceLastPurchaseDate } from './invoice.js';

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

describe('invoiceLastPurchaseDate', () => {
  it('é o dia antes do fechamento da fatura', () => {
    expect(formatDate(invoiceLastPurchaseDate(parseDate('2026-10-10'), 3))).toBe('2026-10-02');
    // fecha dia 25, vence dia 5: a fatura de 05/10 fecha em 25/09
    expect(formatDate(invoiceLastPurchaseDate(parseDate('2026-10-05'), 25))).toBe('2026-09-24');
  });

  it('é sempre uma compra que cai exatamente naquela fatura', () => {
    // Todas as combinações de fechamento e vencimento. Os vencimentos testados são os que
    // existem de fato (alguma compra cai neles): com fechamento 28 e vencimento 29, por
    // exemplo, fevereiro não tem fatura, porque os dois dias viram 28/02.
    for (let closingDay = 1; closingDay <= 31; closingDay++) {
      for (let dueDay = 1; dueDay <= 31; dueDay++) {
        const dueDates = new Set<string>();
        for (let day = parseDate('2026-01-01'); day < parseDate('2029-01-01'); day = addDays(day, 1)) {
          dueDates.add(formatDate(invoiceDueDate(day, closingDay, dueDay)));
        }
        for (const due of dueDates) {
          const lastPurchase = invoiceLastPurchaseDate(parseDate(due), closingDay);
          expect(formatDate(invoiceDueDate(lastPurchase, closingDay, dueDay))).toBe(due);
        }
      }
    }
  });
});
