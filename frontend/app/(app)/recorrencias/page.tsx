import { Plus, Repeat } from "lucide-react";
import type { Metadata } from "next";
import { Amount } from "@/components/amount";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RecurrenceActions } from "@/components/recurrences/recurrence-actions";
import { RecurrenceDialog } from "@/components/recurrences/recurrence-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { callBackend } from "@/lib/call-backend";
import { formatDate, formatMoney, today } from "@/lib/format";
import { describeSchedule, hasEnded } from "@/lib/recurrence";
import type { Card, Category, Recurrence } from "@/lib/types";

export const metadata: Metadata = { title: "Recorrências" };

export default async function RecurrencesPage() {
  const [recurrences, cards, categories] = await Promise.all([
    callBackend<Recurrence[]>("/recurrences"),
    callBackend<Card[]>("/cards"),
    callBackend<Category[]>("/categories"),
  ]);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const now = today();

  const active = recurrences.filter((recurrence) => !hasEnded(recurrence, now));
  const ended = recurrences.filter((recurrence) => hasEnded(recurrence, now));

  // Estimativa mensal das recorrências mensais ativas (as mais comuns: contas e salário)
  const monthly = active.filter((r) => r.frequency === "MONTHLY" && r.interval === 1);
  const monthlyOut = monthly.filter((r) => r.type === "OUTFLOW").reduce((sum, r) => sum + r.amount, 0);
  const monthlyIn = monthly.filter((r) => r.type === "INFLOW").reduce((sum, r) => sum + r.amount, 0);

  const newButton = (
    <RecurrenceDialog
      cards={cards}
      categories={categories}
      trigger={
        <Button>
          <Plus /> Nova recorrência
        </Button>
      }
    />
  );

  const renderList = (list: Recurrence[], isEnded: boolean) => (
    <ul className="divide-y rounded-xl border bg-card">
      {list.map((recurrence) => {
        const category = recurrence.categoryId ? categoryById.get(recurrence.categoryId) : undefined;
        const card = recurrence.cardId ? cardById.get(recurrence.cardId) : undefined;
        return (
          <li key={recurrence.id} className="flex items-center gap-3 px-4 py-3">
            <CategoryIcon category={category} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{recurrence.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>{describeSchedule(recurrence)}</span>
                {card && (
                  <Badge variant="outline" className="font-normal">
                    {card.name}
                  </Badge>
                )}
                {recurrence.endDate && (
                  <Badge variant="secondary" className="font-normal">
                    {isEnded ? "Encerrada em" : "Até"} {formatDate(recurrence.endDate)}
                  </Badge>
                )}
              </div>
            </div>
            <Amount value={recurrence.amount} type={recurrence.type} className="text-sm font-medium" />
            <RecurrenceActions recurrence={recurrence} cards={cards} categories={categories} ended={isEnded} />
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <PageHeader
        title="Recorrências"
        icon={Repeat}
        tone="violet"
        description="Aluguel, assinaturas, salário: cadastre uma vez e os lançamentos aparecem sozinhos na data."
        actions={newButton}
      />

      {recurrences.length === 0 ? (
        <EmptyState
          icon={Repeat}
          tone="violet"
          title="Nenhuma recorrência cadastrada"
          description="Cadastre contas fixas e entradas que se repetem para não precisar lançar todo mês."
          action={newButton}
        />
      ) : (
        <div className="grid gap-10">
          {monthly.length > 0 && (
            <dl className="flex flex-wrap gap-x-10 gap-y-3 border-b pb-6">
              <div>
                <dt className="text-sm text-muted-foreground">Contas fixas por mês</dt>
                <dd className="tabular mt-0.5 text-2xl font-semibold">{formatMoney(monthlyOut)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Entradas fixas por mês</dt>
                <dd className="tabular mt-0.5 text-2xl font-semibold">{formatMoney(monthlyIn)}</dd>
              </div>
            </dl>
          )}
          <section>
            <h2 className="mb-3 font-semibold">Ativas</h2>
            {active.length > 0 ? (
              renderList(active, false)
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma recorrência ativa.</p>
            )}
          </section>
          {ended.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold text-muted-foreground">Encerradas</h2>
              {renderList(ended, true)}
            </section>
          )}
        </div>
      )}
    </>
  );
}
