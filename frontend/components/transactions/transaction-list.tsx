import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { TransactionActions } from "@/components/transactions/transaction-actions";
import { CategoryIcon } from "@/components/category-icon";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/lib/format";
import { isProjected, type Card, type Category, type Entry, type Person } from "@/lib/types";
import { cn } from "@/lib/utils";

// Lista no formato de extrato, agrupada por dia. Recorrências previstas aparecem sem ações.
export function TransactionList({
  transactions,
  cards,
  categories,
  people,
  showActions = true,
}: {
  transactions: Entry[];
  cards: Card[];
  categories: Category[];
  people: Person[];
  showActions?: boolean;
}) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const personById = new Map(people.map((person) => [person.id, person]));

  const days = Map.groupBy(transactions, (transaction) => transaction.date);

  return (
    <div className="grid gap-6">
      {[...days].map(([date, dayTransactions]) => (
        <section key={date}>
          <h3 className="mb-1 text-sm font-medium text-muted-foreground first-letter:uppercase">
            {formatLongDate(date)}
          </h3>
          <ul className="divide-y rounded-xl border bg-card">
            {dayTransactions.map((transaction) => {
              const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined;
              const card = transaction.cardId ? cardById.get(transaction.cardId) : undefined;
              const person = transaction.personId ? personById.get(transaction.personId) : undefined;
              const projected = isProjected(transaction);
              return (
                <li
                  key={transaction.id ?? `r${transaction.recurrenceId}-${transaction.date}`}
                  className={cn("flex items-center gap-3 px-4 py-3", projected && "bg-muted/40")}
                >
                  <CategoryIcon category={category} className="size-9 sm:size-10 [&_svg]:size-4 sm:[&_svg]:size-5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{transaction.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>
                        {transaction.invoiceRemainder ? "Fatura sem detalhe" : (category?.name ?? "Sem categoria")}
                      </span>
                      {card && (
                        <Badge variant="outline" className="font-normal">
                          {card.name}
                        </Badge>
                      )}
                      {person && (
                        <Badge variant="outline" className="gap-1 pl-0.5 font-normal">
                          <PersonAvatar person={person} size="xs" className="size-4 text-[9px]" />
                          {person.name}
                        </Badge>
                      )}
                      {transaction.installmentCount && (
                        <Badge variant="secondary" className="tabular font-normal">
                          {transaction.installmentNumber}/{transaction.installmentCount}
                        </Badge>
                      )}
                      {transaction.invoiceRemainder && (
                        <Badge variant="secondary" className="font-normal">
                          Total informado
                        </Badge>
                      )}
                      {projected ? (
                        <Badge variant="outline" className="border-dashed font-normal">
                          Previsto
                        </Badge>
                      ) : (
                        transaction.recurrenceId && (
                          <Badge variant="secondary" className="font-normal">
                            Recorrente
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                  <Amount
                    value={transaction.amount}
                    type={transaction.type}
                    className={cn("text-sm font-medium", projected && "opacity-70")}
                  />
                  {showActions && projected && (
                    // Previsto vem da regra da recorrência: é lá que se edita
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link href="/recorrencias" aria-label={`Ver a recorrência ${transaction.name}`}>
                        <CalendarClock />
                      </Link>
                    </Button>
                  )}
                  {showActions && !projected && (
                    <TransactionActions
                      transaction={transaction}
                      cards={cards}
                      categories={categories}
                      people={people}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
