import { Amount } from "@/components/amount";
import { TransactionActions } from "@/components/transactions/transaction-actions";
import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";
import { formatLongDate } from "@/lib/format";
import type { Card, Category, Transaction } from "@/lib/types";

// Lista no formato de extrato, agrupada por dia
export function TransactionList({
  transactions,
  cards,
  categories,
  showActions = true,
}: {
  transactions: Transaction[];
  cards: Card[];
  categories: Category[];
  showActions?: boolean;
}) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const cardById = new Map(cards.map((card) => [card.id, card]));

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
              return (
                <li key={transaction.id} className="flex items-center gap-3 px-4 py-3">
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
                      {transaction.recurrenceId && (
                        <Badge variant="secondary" className="font-normal">
                          Recorrente
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Amount value={transaction.amount} type={transaction.type} className="text-sm font-medium" />
                  {showActions && (
                    <TransactionActions transaction={transaction} cards={cards} categories={categories} />
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
