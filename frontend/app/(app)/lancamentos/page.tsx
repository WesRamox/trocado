import { ArrowLeftRight, Plus, ReceiptText } from "lucide-react";
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
import { getProfile } from "@/lib/profile";
import type { Card, Category, Person, ProjectedTransaction, Transaction, TransactionType } from "@/lib/types";
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
  const { timezone } = await getProfile();
  const month = parseMonth(params.mes, timezone);
  const filter = typeof params.tipo === "string" && params.tipo in TYPE_BY_FILTER ? params.tipo : undefined;

  const type = filter && TYPE_BY_FILTER[filter];
  const [transactions, forecast, cards, categories, people] = await Promise.all([
    callBackend<Transaction[]>("/transactions", { query: { month, type } }),
    callBackend<ProjectedTransaction[]>("/transactions/forecast", { query: { month, type } }),
    callBackend<Card[]>("/cards"),
    callBackend<Category[]>("/categories"),
    callBackend<Person[]>("/people"),
  ]);

  // Compras de outras pessoas aparecem na lista, mas não mexem no seu saldo. O previsto entra no saldo.
  const total = [...transactions, ...forecast]
    .filter((t) => t.personId === null)
    .reduce((sum, t) => sum + (t.type === "INFLOW" ? t.amount : -t.amount), 0);
  const newButton = (
    <TransactionDialog
      cards={cards}
      categories={categories}
      people={people}
      trigger={
        <Button>
          <Plus /> Novo lançamento
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader title="Lançamentos" icon={ArrowLeftRight} tone="emerald" actions={newButton} />

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

      {transactions.length === 0 && forecast.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          tone="emerald"
          title={`Nenhum lançamento em ${monthName(month)}`}
          description="Registre uma despesa ou entrada para ela aparecer aqui."
          action={newButton}
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {transactions.length} {transactions.length === 1 ? "lançamento" : "lançamentos"}
            {forecast.length > 0 && ` e ${forecast.length} ${forecast.length === 1 ? "previsto" : "previstos"}`},{" "}
            {forecast.length > 0 ? "saldo previsto de" : "saldo de"}{" "}
            <span className={cn("tabular font-medium", total >= 0 ? "text-inflow" : "text-outflow")}>
              {formatMoney(total)}
            </span>
          </p>
          {forecast.length > 0 && (
            <section className="mb-8">
              <h2 className="font-semibold">Previstos em {monthName(month)}</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                Recorrências que ainda vão acontecer. Viram lançamento sozinhas no dia.
              </p>
              {/* Do mais próximo para o mais distante */}
              <TransactionList transactions={forecast} cards={cards} categories={categories} people={people} />
            </section>
          )}
          {transactions.length > 0 && (
            <TransactionList transactions={transactions} cards={cards} categories={categories} people={people} />
          )}
        </>
      )}
    </>
  );
}
