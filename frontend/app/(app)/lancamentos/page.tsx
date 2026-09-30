import { ArrowLeftRight, Plus, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { MonthNav } from "@/components/month-nav";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { callBackend } from "@/lib/call-backend";
import { formatMoney, monthName, parseMonth } from "@/lib/format";
import { type Page, parsePage } from "@/lib/pagination";
import { getProfile } from "@/lib/profile";
import type {
  Card,
  Category,
  Person,
  ProjectedTransaction,
  Summary,
  Transaction,
  TransactionType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Lançamentos" };

const FILTERS = [
  { value: undefined, label: "Todos" },
  { value: "saidas", label: "Saídas" },
  { value: "entradas", label: "Entradas" },
] as const;

const TYPE_BY_FILTER: Record<string, TransactionType> = { saidas: "OUTFLOW", entradas: "INFLOW" };

const PAGE_SIZE = 20;

export default async function TransactionsPage({ searchParams }: PageProps<"/lancamentos">) {
  const params = await searchParams;
  const { timezone } = await getProfile();
  const month = parseMonth(params.mes, timezone);
  const filter = typeof params.tipo === "string" && params.tipo in TYPE_BY_FILTER ? params.tipo : undefined;
  const requestedPage = parsePage(params.pagina);

  const type = filter && TYPE_BY_FILTER[filter];
  // Só a página pedida vem do backend; o saldo do mês vem pronto do resumo
  const [transactions, forecast, summary, cards, categories, people] = await Promise.all([
    callBackend<Page<Transaction>>("/transactions", { query: { month, type, page: requestedPage, pageSize: PAGE_SIZE } }),
    callBackend<ProjectedTransaction[]>("/transactions/forecast", { query: { month, type } }),
    callBackend<Summary>("/transactions/summary", { query: { month } }),
    callBackend<Card[]>("/cards"),
    callBackend<Category[]>("/categories"),
    callBackend<Person[]>("/people"),
  ]);

  // Página além do fim (ex.: excluiu o último da última página): vai para a última
  if (transactions.items.length === 0 && transactions.totalItems > 0) {
    const search = new URLSearchParams({ mes: month, ...(filter && { tipo: filter }) });
    if (transactions.totalPages > 1) search.set("pagina", String(transactions.totalPages));
    redirect(`/lancamentos?${search}`);
  }
  const { page, totalItems } = transactions;

  // Compras de outras pessoas aparecem na lista, mas não mexem no seu saldo. O previsto entra no saldo.
  const total = type === "OUTFLOW" ? -summary.outflow : type === "INFLOW" ? summary.inflow : summary.balance;
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

      {totalItems === 0 && forecast.length === 0 ? (
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
            {totalItems} {totalItems === 1 ? "lançamento" : "lançamentos"}
            {forecast.length > 0 && ` e ${forecast.length} ${forecast.length === 1 ? "previsto" : "previstos"}`},{" "}
            {forecast.length > 0 ? "saldo previsto de" : "saldo de"}{" "}
            <span className={cn("tabular font-medium", total >= 0 ? "text-inflow" : "text-outflow")}>
              {formatMoney(total)}
            </span>
          </p>
          {/* Previstos só na primeira página, antes dos lançamentos */}
          {forecast.length > 0 && page === 1 && (
            <section className="mb-8">
              <h2 className="font-semibold">Previstos em {monthName(month)}</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                Recorrências que ainda vão acontecer. Viram lançamento sozinhas no dia.
              </p>
              {/* Do mais próximo para o mais distante */}
              <TransactionList transactions={forecast} cards={cards} categories={categories} people={people} />
            </section>
          )}
          {transactions.items.length > 0 && (
            <TransactionList transactions={transactions.items} cards={cards} categories={categories} people={people} />
          )}
          <Pagination
            page={page}
            totalPages={transactions.totalPages}
            totalItems={totalItems}
            pageSize={transactions.pageSize}
            basePath="/lancamentos"
            params={{ mes: month, tipo: filter }}
            itemLabel={["lançamento", "lançamentos"]}
          />
        </>
      )}
    </>
  );
}
