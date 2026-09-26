import { ArrowLeft, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardActions } from "@/components/cards/card-actions";
import { CardVisual } from "@/components/cards/card-visual";
import { EmptyState } from "@/components/empty-state";
import { MonthNav } from "@/components/month-nav";
import { TransactionList } from "@/components/transactions/transaction-list";
import { ApiError, callBackend } from "@/lib/call-backend";
import { formatDate, formatMoney, monthName, parseMonth } from "@/lib/format";
import type { Card, Category, Invoice, Transaction } from "@/lib/types";

export const metadata: Metadata = { title: "Cartão" };

export default async function CardPage({ params, searchParams }: PageProps<"/cartoes/[id]">) {
  const { id } = await params;
  const month = parseMonth((await searchParams).mes);

  const card = await callBackend<Card>(`/cards/${Number(id)}`).catch((error) => {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  });
  const isCredit = card.type === "CREDIT";

  const [cards, categories, statement] = await Promise.all([
    callBackend<Card[]>("/cards"),
    callBackend<Category[]>("/categories"),
    // Crédito: fatura que vence no mês. Débito: compras do mês.
    isCredit
      ? callBackend<Invoice>(`/cards/${card.id}/invoices/${month}`)
      : callBackend<Transaction[]>("/transactions", { query: { month, cardId: card.id } }).then((transactions) => ({
          total: transactions.reduce((sum, t) => sum + (t.type === "OUTFLOW" ? t.amount : -t.amount), 0),
          dueDate: null,
          transactions,
        })),
  ]);

  const limitUsage =
    isCredit && card.creditLimit ? Math.min(statement.total / card.creditLimit, 1) : null;

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
            <p className="text-sm text-muted-foreground">
              {isCredit && statement.dueDate
                ? `Vence em ${formatDate(statement.dueDate)}`
                : `Total de ${monthName(month)}`}
            </p>
            <p className="tabular mt-1 text-4xl font-semibold tracking-tight">{formatMoney(statement.total)}</p>
            {limitUsage !== null && card.creditLimit && (
              <div className="mt-4 max-w-sm">
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${Math.round(limitUsage * 100)}% do limite`}
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${limitUsage * 100}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {Math.round(limitUsage * 100)}% do limite de {formatMoney(card.creditLimit)}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6">
            {statement.transactions.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                tone="sky"
                title={isCredit ? `Nenhuma compra na fatura de ${monthName(month)}` : "Nenhuma compra neste mês"}
                description="Compras lançadas com este cartão aparecem aqui."
              />
            ) : (
              <TransactionList transactions={statement.transactions} cards={cards} categories={categories} />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
