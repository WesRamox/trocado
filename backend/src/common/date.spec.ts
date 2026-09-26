import { addMonths, currentMonth, formatDate, monthRange, monthsBetween, parseDate, today } from './date.js';

describe('date', () => {
  it('addMonths usa o último dia quando o mês é mais curto', () => {
    expect(formatDate(addMonths(parseDate('2026-01-31'), 1))).toBe('2026-02-28');
    expect(formatDate(addMonths(parseDate('2028-01-31'), 1))).toBe('2028-02-29');
    expect(formatDate(addMonths(parseDate('2026-11-15'), 3))).toBe('2027-02-15');
  });

  it('monthRange cobre o mês inteiro', () => {
    const { start, end } = monthRange('2026-12');
    expect(formatDate(start)).toBe('2026-12-01');
    expect(formatDate(end)).toBe('2027-01-01');
  });
});

describe('monthsBetween', () => {
  it('lista os meses do intervalo, virando o ano', () => {
    expect(monthsBetween('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });

  it('um único mês', () => {
    expect(monthsBetween('2026-09', '2026-09')).toEqual(['2026-09']);
  });
});

describe('today', () => {
  // 01:30 UTC de 27/09: ainda é 26/09 no Brasil, já é 27/09 no Japão
  const now = new Date('2026-09-27T01:30:00Z');

  it('usa o fuso da pessoa, não o do servidor', () => {
    expect(formatDate(today('America/Sao_Paulo', now))).toBe('2026-09-26');
    expect(formatDate(today('Asia/Tokyo', now))).toBe('2026-09-27');
    expect(formatDate(today('UTC', now))).toBe('2026-09-27');
  });

  it('currentMonth vira o mês no fuso da pessoa', () => {
    vi.useFakeTimers({ now: new Date('2026-10-01T02:00:00Z') });
    try {
      expect(currentMonth('America/Sao_Paulo')).toBe('2026-09');
      expect(currentMonth('Europe/Lisbon')).toBe('2026-10');
    } finally {
      vi.useRealTimers();
    }
  });
});
