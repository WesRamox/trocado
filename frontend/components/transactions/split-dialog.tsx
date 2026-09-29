"use client";

import { useState } from "react";
import { CurrencyInput } from "@/components/currency-input";
import { Field, FormError } from "@/components/field";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { callBackend } from "@/lib/call-backend";
import { formatMoney } from "@/lib/format";
import { requireAmount } from "@/lib/form-data";
import type { Person, Transaction } from "@/lib/types";
import { useFormRequest } from "@/lib/use-request";
import { cn } from "@/lib/utils";

// Metade da parcela, com o centavo que sobra ficando com você
export const halfOf = (amount: number) => Math.floor((amount * 100) / 2) / 100;

// Divide uma compra com outra pessoa (ex.: metade sua, metade da namorada). Vale para todas as parcelas.
export function SplitDialog({
  transaction,
  people,
  open,
  onOpenChange,
}: {
  transaction: Transaction;
  people: Person[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dividir “{transaction.name}”</DialogTitle>
          <DialogDescription>
            A parte da pessoa sai dos seus gastos e aparece em Emprestados.
            {transaction.installmentCount && ` Vale para as ${transaction.installmentCount} parcelas.`}
          </DialogDescription>
        </DialogHeader>
        {open && <SplitForm transaction={transaction} people={people} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SplitForm({
  transaction,
  people,
  onDone,
}: {
  transaction: Transaction;
  people: Person[];
  onDone: () => void;
}) {
  // A própria dona da compra não aparece: não há o que dividir com ela
  const options = people.filter((person) => person.id !== transaction.personId);
  const [personId, setPersonId] = useState(options[0]?.id);
  const [share, setShare] = useState(halfOf(transaction.amount));
  const person = options.find((p) => p.id === personId);

  const { error, onSubmit, pending } = useFormRequest(
    async (form) => {
      await callBackend(`/transactions/${transaction.id}/split`, {
        method: "POST",
        body: { personId, amount: requireAmount(form) },
      });
      return `Compra dividida com ${person?.name}`;
    },
    { onSuccess: onDone },
  );

  const unit = transaction.installmentCount ? " por parcela" : "";

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div role="radiogroup" aria-label="Com quem dividir" className="flex flex-wrap gap-2">
        {options.map((p) => (
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

      <Field
        label={`Parte ${person ? `de ${person.name}` : "da pessoa"}${unit}`}
        htmlFor="amount"
        hint={`Começa pela metade de ${formatMoney(transaction.amount)}.`}
      >
        <CurrencyInput id="amount" name="amount" defaultValue={halfOf(transaction.amount)} onValueChange={setShare} />
      </Field>

      <p className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
        Sua parte fica em{" "}
        <span className="tabular font-medium text-foreground">
          {formatMoney(Math.max(transaction.amount - share, 0))}
        </span>
        {unit}. A fatura continua com o valor inteiro.
      </p>

      <FormError message={error} />
      <DialogFooter>
        <Button type="submit" disabled={pending || !person}>
          {pending ? "Dividindo..." : "Dividir compra"}
        </Button>
      </DialogFooter>
    </form>
  );
}
