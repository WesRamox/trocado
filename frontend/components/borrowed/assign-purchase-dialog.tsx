"use client";

import { Link2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { FormError } from "@/components/field";
import { PersonAvatar } from "@/components/people/person-avatar";
import { halfOf } from "@/components/transactions/split-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, callBackend } from "@/lib/call-backend";
import { formatDate, formatMoney, shiftMonth } from "@/lib/format";
import type { Card, Person, Transaction } from "@/lib/types";
import { useRequest } from "@/lib/use-request";
import { cn } from "@/lib/utils";

// Quantos meses de compras (pela data) oferecer: a fatura de um mês costuma ter compras dos dois anteriores
const MONTHS_BACK = 3;

// Marca uma compra já lançada como sendo de outra pessoa. Parcelada: vale para todas as parcelas.
export function AssignPurchaseDialog({
  people,
  cards,
  month,
  trigger,
}: {
  people: Person[];
  cards: Card[];
  // Mês de cobrança da página, 'YYYY-MM'
  month: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular compra lançada</DialogTitle>
          <DialogDescription>
            Escolha de quem é e toque na compra. Se for parcelada, vale para todas as parcelas.
          </DialogDescription>
        </DialogHeader>
        {open && <AssignPurchase people={people} cards={cards} month={month} />}
      </DialogContent>
    </Dialog>
  );
}

function AssignPurchase({ people, cards, month }: { people: Person[]; cards: Card[]; month: string }) {
  const [personId, setPersonId] = useState(people[0]?.id);
  const [query, setQuery] = useState("");
  const [purchases, setPurchases] = useState<Transaction[]>();
  const [loadError, setLoadError] = useState<string>();
  const [assigned, setAssigned] = useState<Set<number>>(new Set());
  // Metade: a compra é dividida, metade sua e metade da pessoa
  const [half, setHalf] = useState(false);
  const { run, pending } = useRequest();
  const cardById = new Map(cards.map((card) => [card.id, card]));

  useEffect(() => {
    const months = Array.from({ length: MONTHS_BACK }, (_, i) => shiftMonth(month, -i));
    Promise.all(
      months.map((m) => callBackend<Transaction[]>("/transactions", { query: { month: m, type: "OUTFLOW" } })),
    ).then(
      (lists) => {
        // Uma linha por compra: parceladas aparecem uma vez só
        const seen = new Set<string>();
        const unique = lists.flat().filter((t) => {
          if (t.personId !== null || t.invoiceRemainder) return false;
          if (!t.installmentGroupId) return true;
          if (seen.has(t.installmentGroupId)) return false;
          seen.add(t.installmentGroupId);
          return true;
        });
        setPurchases(unique.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
      },
      (error) => setLoadError(error instanceof ApiError ? error.message : "Não foi possível carregar as compras."),
    );
  }, [month]);

  const person = people.find((p) => p.id === personId);
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const visible = (purchases ?? []).filter(
    (t) => !assigned.has(t.id) && t.name.toLocaleLowerCase("pt-BR").includes(normalized),
  );

  const assign = (transaction: Transaction) =>
    person &&
    run(
      async () => {
        if (half) {
          await callBackend(`/transactions/${transaction.id}/split`, {
            method: "POST",
            body: { personId: person.id, amount: halfOf(transaction.amount) },
          });
          return `${transaction.name} dividida com ${person.name}`;
        }
        await callBackend(`/transactions/${transaction.id}`, { method: "PATCH", body: { personId: person.id } });
        return `${transaction.name} agora é de ${person.name}`;
      },
      { onSuccess: () => setAssigned((current) => new Set(current).add(transaction.id)) },
    );

  return (
    <div className="grid gap-4">
      <div role="radiogroup" aria-label="De quem é" className="flex flex-wrap gap-2">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={p.id === personId}
            onClick={() => setPersonId(p.id)}
            className={cn(
              "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              p.id === personId ? "border-foreground bg-muted font-medium" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <PersonAvatar person={p} size="xs" className="size-6" />
            {p.name}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label="Quanto é da pessoa" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {[
          { value: false, label: "A compra inteira" },
          { value: true, label: "Metade" },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={half === option.value}
            onClick={() => setHalf(option.value)}
            className={cn(
              "rounded-md py-1.5 text-sm text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              half === option.value && "bg-card font-medium text-foreground shadow-xs",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Label htmlFor="purchase-search" className="sr-only">
          Buscar compra
        </Label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="purchase-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar pelo nome da compra"
          className="pl-9"
        />
      </div>

      {loadError ? (
        <FormError message={loadError} />
      ) : !purchases ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Carregando as compras...</p>
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma compra sua encontrada nos últimos meses.
        </p>
      ) : (
        <ul className="-mx-2 max-h-80 divide-y overflow-y-auto">
          {visible.map((t) => {
            const card = t.cardId ? cardById.get(t.cardId) : undefined;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={pending || !person}
                  onClick={() => assign(t)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{formatDate(t.date)}</span>
                      {card && (
                        <Badge variant="outline" className="font-normal">
                          {card.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="tabular text-sm font-medium">
                    {t.installmentCount ? `${t.installmentCount}× ${formatMoney(t.amount)}` : formatMoney(t.amount)}
                  </span>
                  <Link2 className="size-4 text-muted-foreground" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
