"use client";

import { useState } from "react";
import { CurrencyInput } from "@/components/currency-input";
import { Field, FormError } from "@/components/field";
import { CardSelect, CategorySelect, TypeToggle } from "@/components/form-controls";
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
import { optionalId, optionalText, requireAmount, text } from "@/lib/form-data";
import { today } from "@/lib/format";
import type { Card, Category, Transaction, TransactionType } from "@/lib/types";
import { useFormRequest } from "@/lib/use-request";

interface Props {
  cards: Card[];
  categories: Category[];
  // Sem transaction = criação
  transaction?: Transaction;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TransactionDialog({ cards, categories, transaction, trigger, open, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{transaction ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          <DialogDescription>
            {transaction?.installmentCount
              ? `Parcela ${transaction.installmentNumber} de ${transaction.installmentCount}. As alterações valem só para esta parcela.`
              : "Registre uma despesa ou uma entrada."}
          </DialogDescription>
        </DialogHeader>
        {/* Montado só enquanto aberto: os campos começam limpos a cada abertura */}
        {isOpen && (
          <TransactionForm
            cards={cards}
            categories={categories}
            transaction={transaction}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function transactionBody(form: FormData) {
  return {
    type: text(form, "type"),
    name: text(form, "name"),
    amount: requireAmount(form),
    date: text(form, "date"),
    description: optionalText(form, "description"),
    cardId: optionalId(form, "cardId"),
    categoryId: optionalId(form, "categoryId"),
  };
}

function TransactionForm({
  cards,
  categories,
  transaction,
  onDone,
}: Omit<Props, "trigger" | "open" | "onOpenChange"> & { onDone: () => void }) {
  const { error, onSubmit, pending } = useFormRequest(
    async (form) => {
      const body = transactionBody(form);
      if (transaction) {
        await callBackend(`/transactions/${transaction.id}`, { method: "PATCH", body });
        return "Lançamento atualizado";
      }
      const installments = Number(text(form, "installments") || 1);
      await callBackend("/transactions", {
        method: "POST",
        body: { ...body, ...(installments > 1 && { installments }) },
      });
      return installments > 1 ? `Lançamento criado em ${installments} parcelas` : "Lançamento criado";
    },
    { onSuccess: onDone },
  );

  const [type, setType] = useState<TransactionType>(transaction?.type ?? "OUTFLOW");
  const [cardId, setCardId] = useState(transaction?.cardId ? String(transaction.cardId) : "none");
  const selectedCard = cards.find((card) => String(card.id) === cardId);

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <TypeToggle value={type} onChange={setType} />

      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <Field label="Descrição" htmlFor="name">
          <Input
            id="name"
            name="name"
            required
            maxLength={100}
            defaultValue={transaction?.name}
            placeholder={type === "OUTFLOW" ? "Ex.: Mercado" : "Ex.: Salário"}
          />
        </Field>
        <Field label={transaction || type === "INFLOW" ? "Valor" : "Valor total"} htmlFor="amount">
          <CurrencyInput id="amount" name="amount" defaultValue={transaction?.amount} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data" htmlFor="date">
          <Input id="date" name="date" type="date" required defaultValue={transaction?.date ?? today()} />
        </Field>
        <Field label="Categoria" htmlFor="categoryId">
          <CategorySelect categories={categories} type={type} defaultValue={transaction?.categoryId} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cartão" htmlFor="cardId">
          <CardSelect cards={cards} value={cardId} onValueChange={setCardId} />
        </Field>
        {!transaction && type === "OUTFLOW" && (
          <Field
            label="Parcelas"
            htmlFor="installments"
            hint={selectedCard?.type === "CREDIT" ? "Cada parcela entra na fatura seguinte." : undefined}
          >
            <Input id="installments" name="installments" type="number" min={1} max={120} defaultValue={1} />
          </Field>
        )}
      </div>

      <Field label="Observação" htmlFor="description">
        <Input
          id="description"
          name="description"
          maxLength={500}
          defaultValue={transaction?.description ?? ""}
          placeholder="Opcional"
        />
      </Field>

      <FormError message={error} />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : transaction ? "Salvar alterações" : "Criar lançamento"}
        </Button>
      </DialogFooter>
    </form>
  );
}
