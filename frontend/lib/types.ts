// Formatos retornados pela API. Valores em reais, datas em 'YYYY-MM-DD'.

export type TransactionType = "INFLOW" | "OUTFLOW";
export type CardType = "CREDIT" | "DEBIT";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Card {
  id: number;
  name: string;
  type: CardType;
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
  installmentNumber: number | null;
  installmentCount: number | null;
  installmentGroupId: string | null;
}

export interface Summary {
  month: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface Invoice {
  cardId: number;
  month: string;
  dueDate: string;
  total: number;
  transactions: Transaction[];
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
