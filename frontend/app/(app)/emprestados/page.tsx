import { CalendarClock, CheckCheck, HandCoins, Link2, Plus, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { AssignPurchaseDialog } from "@/components/borrowed/assign-purchase-dialog";
import { ReceivedButton } from "@/components/borrowed/received-button";
import { StatTile } from "@/components/dashboard/stat-tile";
import { EmptyState } from "@/components/empty-state";
import { MonthNav } from "@/components/month-nav";
import { PageHeader } from "@/components/page-header";
import { PersonActions } from "@/components/people/person-actions";
import { PersonAvatar } from "@/components/people/person-avatar";
import { PersonDialog } from "@/components/people/person-dialog";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { callBackend } from "@/lib/call-backend";
import { formatDate, formatMoney, monthName, parseMonth } from "@/lib/format";
import { getProfile } from "@/lib/profile";
import type { Borrowed, BorrowedPerson, Card, Category, Person } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Emprestados" };

export default async function BorrowedPage({ searchParams }: PageProps<"/emprestados">) {
  const { timezone } = await getProfile();
  const month = parseMonth((await searchParams).mes, timezone);

  const [borrowed, people, cards, categories] = await Promise.all([
    callBackend<Borrowed>("/borrowed", { query: { month } }),
    callBackend<Person[]>("/people"),
    callBackend<Card[]>("/cards"),
    callBackend<Category[]>("/categories"),
  ]);
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const name = monthName(month);

  const addPersonButton = (
    <PersonDialog
      trigger={
        <Button variant="outline">
          <Plus /> Pessoa
        </Button>
      }
    />
  );

  if (people.length === 0) {
    return (
      <>
        <PageHeader
          title="Emprestados"
          icon={HandCoins}
          tone="rose"
          description="Compras de outras pessoas nos seus cartões e quanto cada uma te deve."
        />
        <EmptyState
          icon={Users}
          tone="rose"
          title="Quem usa seus cartões?"
          description="Adicione as pessoas (pai, mãe, namorada...) e marque as compras delas. Elas saem dos seus gastos e aparecem aqui para você cobrar."
          action={addPersonButton}
        />
      </>
    );
  }

  const actions = (
    <>
      <AssignPurchaseDialog
        people={people}
        cards={cards}
        month={month}
        trigger={
          <Button variant="outline">
            <Link2 /> Vincular compra
          </Button>
        }
      />
      <TransactionDialog
        cards={cards}
        categories={categories}
        people={people}
        defaultPersonId={people[0].id}
        trigger={
          <Button>
            <Plus /> Nova compra
          </Button>
        }
      />
    </>
  );

  // Quem tem algo no mês primeiro; quem não tem fica no fim
  const rows = [...borrowed.people].sort((a, b) => Number(b.total !== 0) - Number(a.total !== 0));

  return (
    <>
      <PageHeader
        title="Emprestados"
        icon={HandCoins}
        tone="rose"
        description="Compras de outras pessoas nos seus cartões e quanto cada uma te deve."
        actions={actions}
      />

      <div className="mb-6">
        <MonthNav month={month} basePath="/emprestados" />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatTile
          label={`A receber em ${name}`}
          icon={Wallet}
          tone="rose"
          value={formatMoney(borrowed.pending)}
          detail={borrowed.total > 0 ? `de ${formatMoney(borrowed.total)} das faturas de ${name}` : undefined}
        />
        <StatTile
          label={`Recebido em ${name}`}
          icon={CheckCheck}
          tone="emerald"
          value={formatMoney(borrowed.received)}
        />
        <StatTile
          label="Em aberto no total"
          icon={CalendarClock}
          tone="violet"
          value={formatMoney(borrowed.open)}
          detail="Inclui as parcelas dos próximos meses"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {rows.map((row) => (
          <PersonSection key={row.person.id} row={row} month={month} monthLabel={name} cardById={cardById} />
        ))}
      </div>

      <section className="mt-10 md:max-w-md">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Pessoas</h2>
          <PersonDialog
            trigger={
              <Button variant="outline" size="sm">
                <Plus /> Nova
              </Button>
            }
          />
        </div>
        <ul className="divide-y rounded-xl border bg-card">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-3 px-4 py-2.5">
              <PersonAvatar person={person} />
              <span className="flex-1 truncate text-sm">{person.name}</span>
              <PersonActions person={person} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function PersonSection({
  row,
  month,
  monthLabel,
  cardById,
}: {
  row: BorrowedPerson;
  month: string;
  monthLabel: string;
  cardById: Map<number, Card>;
}) {
  const settled = row.total !== 0 && row.pending === 0;

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <PersonAvatar person={row.person} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{row.person.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.open > 0 ? (
              <>
                <span className="tabular">{formatMoney(row.open)}</span> em aberto no total
              </>
            ) : (
              "Nada em aberto"
            )}
          </p>
        </div>
        <div className="text-right">
          <p className={cn("tabular text-lg font-semibold", settled && "text-inflow")}>
            {formatMoney(settled ? row.received : row.pending)}
          </p>
          <p className="text-xs text-muted-foreground">
            {settled && row.receivedAt ? `Recebido em ${formatDate(row.receivedAt)}` : `A cobrar em ${monthLabel}`}
          </p>
        </div>
        {row.total !== 0 && <ReceivedButton row={row} month={month} />}
      </header>

      {row.items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma compra nas faturas de {monthLabel}.
        </p>
      ) : (
        <ul className="divide-y">
          {row.items.map((t) => {
            const card = t.cardId ? cardById.get(t.cardId) : undefined;
            return (
              <li key={t.id} className={cn("flex items-center gap-3 px-4 py-2.5", t.reimbursedAt && "opacity-60")}>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm", t.reimbursedAt && "line-through")}>{t.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {card && (
                      <Badge variant="outline" className="font-normal">
                        {card.name}
                      </Badge>
                    )}
                    {t.installmentCount && (
                      <Badge variant="secondary" className="tabular font-normal">
                        {t.installmentNumber}/{t.installmentCount}
                      </Badge>
                    )}
                    <span>
                      {t.invoiceDueDate ? `Fatura vence ${formatDate(t.invoiceDueDate)}` : formatDate(t.date)}
                    </span>
                  </div>
                </div>
                <span className="tabular text-sm font-medium">
                  {formatMoney(t.type === "OUTFLOW" ? t.amount : -t.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
