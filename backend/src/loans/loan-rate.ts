// Taxa de juros ao mês de um empréstimo com parcelas iguais (tabela Price), a partir do que caiu
// na conta (principal), do valor da parcela e do número de parcelas. Resolve por bisseção:
// principal = parcela × (1 − (1 + i)^−n) / i
export function monthlyRate(principal: number, installment: number, count: number): number | null {
  if (principal <= 0 || installment <= 0 || count <= 0) return null;
  // Sem juros (ou pagando menos do que recebeu): não há taxa positiva
  if (installment * count <= principal) return 0;

  const presentValue = (rate: number) => installment * ((1 - (1 + rate) ** -count) / rate);
  let low = 1e-9;
  let high = 1;
  // Mais de 100% ao mês: fora do que faz sentido calcular
  if (presentValue(high) > principal) return null;

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    // Quanto maior a taxa, menor o valor presente das parcelas
    if (presentValue(mid) > principal) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
