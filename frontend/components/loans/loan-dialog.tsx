"use client";

import { useState } from "react";
import { CurrencyInput } from "@/components/currency-input";
import { Field, FormError } from "@/components/field";
import { CategorySelect } from "@/components/form-controls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { callBackend } from "@/lib/call-backend";
import { formatMoney, today } from "@/lib/format";
import { optionalId, requireAmount, text } from "@/lib/form-data";
import type { Category, Loan } from "@/lib/types";
import { useFormRequest } from "@/lib/use-request";

// Cria um empréstimo (as parcelas viram lançamentos) ou edita nome, valor recebido e categoria
export function LoanDialog({
  categories,
  loan,
  trigger,
  open,
  onOpenChange,
}: {
  categories: Category[];
  loan?: Loan;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{loan ? "Editar empréstimo" : "Novo empréstimo"}</DialogTitle>
          <DialogDescription>
            {loan
              ? "Valor, parcelas e datas não mudam aqui: para isso, exclua e crie de novo."
              : "As parcelas entram nos seus lançamentos, uma por mês, a partir da 1ª."}
          </DialogDescription>
        </DialogHeader>
        {isOpen && <LoanForm categories={categories} loan={loan} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function LoanForm({ categories, loan, onDone }: { categories: Category[]; loan?: Loan; onDone: () => void }) {
  const [total, setTotal] = useState(loan?.total ?? 0);
  const [installments, setInstallments] = useState(loan?.installments ?? 12);

  const { error, onSubmit, pending } = useFormRequest(
    async (form) => {
      const received = Number(text(form, "received")) || null;
      const common = { name: text(form, "name"), received, categoryId: optionalId(form, "categoryId") };
      if (loan) {
        await callBackend(`/loans/${loan.id}`, { method: "PATCH", body: common });
        return "Empréstimo atualizado";
      }
      await callBackend("/loans", {
        method: "POST",
        body: {
          ...common,
          total: requireAmount(form),
          installments: Number(text(form, "installments")),
          firstDueDate: text(form, "firstDueDate"),
        },
      });
      return "Empréstimo criado";
    },
    { onSuccess: onDone },
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Nome" htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          maxLength={100}
          defaultValue={loan?.name}
          placeholder="Ex.: Empréstimo Nubank"
        />
      </Field>

      {!loan && (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <Field label="Total a pagar" htmlFor="amount" hint="Todas as parcelas somadas, com juros.">
              <CurrencyInput id="amount" name="amount" onValueChange={setTotal} />
            </Field>
            <Field label="Parcelas" htmlFor="installments">
              <Input
                id="installments"
                name="installments"
                type="number"
                required
                min={1}
                max={120}
                value={installments}
                onChange={(event) => setInstallments(Number(event.target.value))}
              />
            </Field>
          </div>
          {total > 0 && installments > 0 && (
            <p className="-mt-2 text-sm text-muted-foreground">
              {installments}× de{" "}
              <span className="tabular font-medium text-foreground">{formatMoney(total / installments)}</span>
            </p>
          )}
          <Field label="1ª parcela" htmlFor="firstDueDate" hint="As outras caem no mesmo dia dos meses seguintes.">
            <Input id="firstDueDate" name="firstDueDate" type="date" required defaultValue={today()} />
          </Field>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valor recebido" htmlFor="received" hint="Opcional: mostra os juros e a taxa.">
          <CurrencyInput id="received" name="received" defaultValue={loan?.received} />
        </Field>
        <Field label="Categoria" htmlFor="categoryId">
          <CategorySelect categories={categories} type="OUTFLOW" defaultValue={loan?.categoryId} />
        </Field>
      </div>

      <FormError message={error} />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : loan ? "Salvar alterações" : "Criar empréstimo"}
        </Button>
      </DialogFooter>
    </form>
  );
}
