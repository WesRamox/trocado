// Formatos retornados pela API. Valores em reais, datas em 'YYYY-MM-DD'.

export type TransactionType = "INFLOW" | "OUTFLOW";
export type CardType = "CREDIT" | "DEBIT";
export type CardBrand = "VISA" | "MASTERCARD" | "ELO" | "AMEX" | "HIPERCARD" | "OTHER";

export interface User {
  id: number;
  name: string;
  email: string;
  // Fuso IANA (ex.: America/Sao_Paulo): define o "hoje" da pessoa
  timezone: string;
}

export interface Card {
  id: number;
  name: string;
  type: CardType;
  brand: CardBrand;
  // Hex escolhido; null = cor automática pelo id
  color: string | null;
  lastFourDigits: string;
  closingDay: number | null;
  dueDay: number | null;
  creditLimit: number | null;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
  // Limite de gastos por mês (só categorias de saída)
  monthlyBudget: number | null;
}

export interface Transaction {
  id: number;
  name: string;
  description: string | null;
  amount: number;
  type: TransactionType;
  date: string;
  invoiceDueDate: string | null;
  cardId: number | null;
  categoryId: number | null;
  recurrenceId: number | null;
  // De quem é a compra quando outra pessoa usou seu cartão; null = sua
  personId: number | null;
  // Dia em que a pessoa reembolsou
  reimbursedAt: string | null;
  // Parte de uma compra dividida: id da parcela original
  splitOfId: number | null;
  // Parcela de um empréstimo bancário
  loanId: number | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  installmentGroupId: string | null;
  // Parte da fatura informada só pelo total, sem os itens
  invoiceRemainder: boolean;
}

// Quem usa seus cartões e te reembolsa
export interface Person {
  id: number;
  name: string;
  color: string | null;
}

export interface BorrowedPerson {
  person: Person;
  total: number;
  received: number;
  pending: number;
  // Último dia em que algo do mês foi recebido
  receivedAt: string | null;
  // Tudo que ainda não foi reembolsado, inclusive parcelas dos próximos meses
  open: number;
  items: Transaction[];
}

// O que cobrar no mês (pelo vencimento das faturas)
export interface Borrowed {
  month: string;
  total: number;
  received: number;
  pending: number;
  open: number;
  people: BorrowedPerson[];
}

// Recorrência que ainda vai acontecer: mesmo formato de um lançamento, sem id.
// Quando o dia chega, vira um lançamento de verdade e sai da previsão.
export interface ProjectedTransaction extends Omit<Transaction, "id"> {
  id: null;
  projected: true;
}

// Linha de extrato: lançamento feito ou previsto
export type Entry = Transaction | ProjectedTransaction;

export const isProjected = (entry: Entry): entry is ProjectedTransaction => entry.id === null;

export interface Summary {
  month: string;
  // Os totais já incluem o previsto; projected* dizem quanto dele é previsão
  inflow: number;
  outflow: number;
  balance: number;
  projectedInflow: number;
  projectedOutflow: number;
}

export interface InvoicePayment {
  id: number;
  amount: number;
  date: string;
}

export interface Invoice {
  cardId: number;
  month: string;
  dueDate: string;
  // Inclui as recorrências previstas; projectedTotal diz quanto dele é previsão
  total: number;
  projectedTotal: number;
  projected: ProjectedTransaction[];
  paid: number;
  // O que falta pagar (nunca negativo)
  remaining: number;
  payments: InvoicePayment[];
  transactions: Transaction[];
}

// Limite do cartão de crédito. Em uso: tudo que ainda não foi pago, inclusive parcelas futuras
export interface CreditLimit {
  cardId: number;
  limit: number | null;
  used: number;
  available: number | null;
}

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface Recurrence {
  id: number;
  name: string;
  description: string | null;
  amount: number;
  type: TransactionType;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  lastGeneratedDate: string | null;
  cardId: number | null;
  categoryId: number | null;
}

// Empréstimo bancário; as parcelas são lançamentos mensais
export interface Loan {
  id: number;
  name: string;
  categoryId: number | null;
  // Quanto você paga no total (com juros)
  total: number;
  installments: number;
  installmentAmount: number;
  firstDueDate: string;
  lastDueDate: string;
  // Quanto caiu na conta; sem ele, não há juros nem taxa
  received: number | null;
  interest: number | null;
  // Fração ao mês (0.029 = 2,9%)
  monthlyRate: number | null;
  // Parcelas que já venceram (debitadas no vencimento)
  paidCount: number;
  paid: number;
  // Saldo devedor: parcelas que ainda vão vencer
  remaining: number;
  nextDueDate: string | null;
}
