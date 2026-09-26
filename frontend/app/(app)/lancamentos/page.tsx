import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { MonthNav } from "@/components/month-nav";
import { PageHeader } from "@/components/page-header";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { callBackend } from "@/lib/call-backend";
import { formatMoney, monthName, parseMonth } from "@/lib/format";
import type { Card, Category, Transaction, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Lançamentos" };

const FILTERS = [
  { value: undefined, label: "Todos" },
  { value: "saidas", label: "Saídas" },
  { value: "entradas", label: "Entradas" },
] as const;

const TYPE_BY_FILTER: Record<string, TransactionType> = { saidas: "OUTFLOW", entradas: "INFLOW" };

export default async function TransactionsPage({ searchParams }: PageProps<"/lancamentos">) {
  const params = await searchParams;
  const month = parseMonth(params.mes);
  const filter = typeof params.tipo === "string" && params.tipo in TYPE_BY_FILTER ? params.tipo : undefined;

  const [transactions, cards, categories] = await Promise.all([
    callBackend<Transaction[]>("/transactions", {
      query: { month, type: filter && TYPE_BY_FILTER[filter] },
    }),
    callBackend<Card[]>("/cards"),
    callBackend<Category[]>("/categories"),
  ]);

  const total = transactions.reduce(
    (sum, t) => sum + (t.type === "INFLOW" ? t.amount : -t.amount),
    0,
  );
  const newButton = (
    <TransactionDialog
      cards={cards}
      categories={categories}
      trigger={
        <Button>
          <Plus /> Novo lançamento
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader title="Lançamentos" actions={newButton} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <MonthNav month={month} basePath="/lancamentos" params={{ tipo: filter }} />
        <nav aria-label="Filtrar por tipo" className="flex gap-1 rounded-lg bg-muted p-1">
          {FILTERS.map(({ value, label }) => {
            const search = new URLSearchParams({ mes: month, ...(value && { tipo: value }) });
            return (
              <Link
                key={label}
                href={`/lancamentos?${search}`}
                aria-current={filter === value ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1 text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filter === value && "bg-card font-medium text-foreground shadow-xs",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          title={`Nenhum lançamento em ${monthName(month)}`}
          description="Registre uma despesa ou entrada para ela aparecer aqui."
          action={newButton}
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {transactions.length} {transactions.length === 1 ? "lançamento" : "lançamentos"}, saldo de{" "}
            <span className={cn("tabular font-medium", total >= 0 ? "text-inflow" : "text-outflow")}>
              {formatMoney(total)}
            </span>
          </p>
          <TransactionList transactions={transactions} cards={cards} categories={categories} />
        </>
      )}
    </>
  );
}
