import { ArrowLeft, HandCoins, ReceiptText, Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardActions } from "@/components/cards/card-actions";
import { CardVisual } from "@/components/cards/card-visual";
import { InvoicePaymentDialog } from "@/components/cards/invoice-payment-dialog";
import { InvoiceTotalDialog } from "@/components/cards/invoice-total-dialog";
import { EmptyState } from "@/components/empty-state";
import { MonthNav } from "@/components/month-nav";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError, callBackend } from "@/lib/call-backend";
import { formatDate, formatMoney, monthName, parseMonth, today } from "@/lib/format";
import { getProfile } from "@/lib/profile";
import type {
  Card,
  Category,
  CreditLimit,
  Entry,
  Invoice,
  Person,
  ProjectedTransaction,
  Transaction,
} from "@/lib/types";

export const metadata: Metadata = { title: "Cartão" };

export default async function CardPage({ params, searchParams }: PageProps<"/cartoes/[id]">) {
  const { id } = await params;
  const { timezone } = await getProfile();
  const month = parseMonth((await searchParams).mes, timezone);

  const card = await callBackend<Card>(`/cards/${Number(id)}`).catch((error) => {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  });
  const isCredit = card.type === "CREDIT";

  const [cards, categories, people, invoice, debitTransactions, debitForecast, creditLimit] = await Promise.all([
    callBackend<Card[]>("/cards"),
    callBackend<Category[]>("/categories"),
    callBackend<Person[]>("/people"),
    // Crédito: fatura que vence no mês. Débito: compras do mês.
    isCredit ? callBackend<Invoice>(`/cards/${card.id}/invoices/${month}`) : null,
    isCredit ? null : callBackend<Transaction[]>("/transactions", { query: { month, cardId: card.id } }),
    isCredit
      ? null
      : callBackend<ProjectedTransaction[]>("/transactions/forecast", { query: { month, cardId: card.id } }),
    isCredit && card.creditLimit ? callBackend<CreditLimit>(`/cards/${card.id}/limit`) : null,
  ]);
  const debitEntries: Entry[] = [...(debitTransactions ?? []), ...(debitForecast ?? [])];
  const statement = invoice ?? {
    total: signedSum(debitEntries),
    projectedTotal: signedSum(debitForecast ?? []),
    dueDate: null,
    transactions: debitTransactions!,
  };
  // Lançamentos e recorrências previstas juntos, pela data
  const entries: Entry[] = [...statement.transactions, ...(invoice ? invoice.projected : (debitForecast ?? []))].sort(
    (a, b) => a.date.localeCompare(b.date),
  );

  const remainder = statement.transactions.find((t) => t.invoiceRemainder);
  const status = invoice && invoiceStatus(invoice, today(timezone));

  // Em uso: tudo que ainda não foi pago, inclusive as parcelas das próximas faturas
  const limitUsage = creditLimit?.limit ? Math.min(creditLimit.used / creditLimit.limit, 1) : null;

  return (
    <>
      <Link
        href="/cartoes"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Cartões
      </Link>

      <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
        <div className="grid content-start gap-4">
          <CardVisual card={card} />
          <CardActions card={card} />
        </div>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isCredit ? "Fatura" : "Compras no débito"}
            </h1>
            <MonthNav month={month} basePath={`/cartoes/${card.id}`} />
          </div>

          <div className="mt-6 border-b pb-6">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {isCredit && statement.dueDate
                ? `Vence em ${formatDate(statement.dueDate)}`
                : `Total de ${monthName(month)}`}
              {status && (
                <Badge variant={status.variant} className="font-normal">
                  {status.label}
                </Badge>
              )}
            </p>
            <p className="tabular mt-1 text-4xl font-semibold tracking-tight">{formatMoney(statement.total)}</p>
            {statement.projectedTotal !== 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Inclui <span className="tabular">{formatMoney(statement.projectedTotal)}</span> de recorrências
                previstas
              </p>
            )}
            {remainder && (
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="tabular">{formatMoney(remainder.amount)}</span> sem detalhe
              </p>
            )}
            {invoice && invoice.paid > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="tabular">{formatMoney(invoice.paid)}</span> pago
                {invoice.remaining > 0 && (
                  <>
                    {" "}
                    · falta <span className="tabular">{formatMoney(invoice.remaining)}</span>
                  </>
                )}
              </p>
            )}
            {invoice && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(invoice.total > 0 || invoice.payments.length > 0) && (
                  <InvoicePaymentDialog
                    card={card}
                    invoice={invoice}
                    trigger={
                      <Button size="sm" variant={invoice.remaining > 0 ? "default" : "outline"}>
                        <HandCoins /> {invoice.remaining > 0 ? "Pagar fatura" : "Ver pagamentos"}
                      </Button>
                    }
                  />
                )}
                <InvoiceTotalDialog
                  card={card}
                  month={month}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Receipt /> {remainder ? "Ajustar total da fatura" : "Informar total da fatura"}
                    </Button>
                  }
                />
              </div>
            )}
            {limitUsage !== null && creditLimit?.limit && (
              <div className="mt-4 max-w-sm">
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${Math.round(limitUsage * 100)}% do limite em uso`}
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${limitUsage * 100}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {Math.round(limitUsage * 100)}% do limite de {formatMoney(creditLimit.limit)} em uso ·{" "}
                  <span className="tabular">{formatMoney(creditLimit.available!)}</span> disponível
                </p>
              </div>
            )}
          </div>

          <div className="mt-6">
            {entries.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                tone="sky"
                title={isCredit ? `Nenhuma compra na fatura de ${monthName(month)}` : "Nenhuma compra neste mês"}
                description="Compras lançadas com este cartão aparecem aqui."
              />
            ) : (
              <TransactionList transactions={entries} cards={cards} categories={categories} people={people} />
            )}
          </div>
        </section>
      </div>
    </>
  );
}

// Saídas somam, entradas (estornos) abatem
const signedSum = (entries: Entry[]) =>
  entries.reduce((sum, t) => sum + (t.type === "OUTFLOW" ? t.amount : -t.amount), 0);

// Situação da fatura pelo que falta pagar e pelo vencimento
function invoiceStatus(invoice: Invoice, todayDate: string) {
  if (invoice.total <= 0) return null;
  if (invoice.remaining === 0) return { label: "Paga", variant: "secondary" } as const;
  if (invoice.dueDate < todayDate) return { label: "Vencida", variant: "destructive" } as const;
  if (invoice.paid > 0) return { label: "Paga em parte", variant: "outline" } as const;
  return { label: "Em aberto", variant: "outline" } as const;
}
