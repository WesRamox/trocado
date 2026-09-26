"use client";

import { useState } from "react";
import { createCard, updateCard } from "@/app/(app)/cartoes/actions";
import { CurrencyInput } from "@/components/currency-input";
import { Field, FormError } from "@/components/field";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Card, CardType } from "@/lib/types";
import { useFormAction } from "@/lib/use-form-action";

export function CardDialog({
  card,
  trigger,
  open,
  onOpenChange,
}: {
  card?: Card;
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{card ? "Editar cartão" : "Novo cartão"}</DialogTitle>
          <DialogDescription>
            Guardamos só os 4 últimos dígitos, para você reconhecer o cartão.
          </DialogDescription>
        </DialogHeader>
        {isOpen && <CardForm card={card} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CardForm({ card, onDone }: { card?: Card; onDone: () => void }) {
  const action = card ? updateCard.bind(null, card.id) : createCard;
  const { error, onSubmit, pending } = useFormAction(action, onDone);
  const [type, setType] = useState<CardType>(card?.type ?? "CREDIT");

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <Field label="Nome" htmlFor="name">
          <Input id="name" name="name" required maxLength={50} defaultValue={card?.name} placeholder="Ex.: Nubank" />
        </Field>
        <Field label="Tipo" htmlFor="type">
          <Select name="type" value={type} onValueChange={(value) => setType(value as CardType)}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CREDIT">Crédito</SelectItem>
              <SelectItem value="DEBIT">Débito</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Últimos 4 dígitos" htmlFor="lastFourDigits">
        <Input
          id="lastFourDigits"
          name="lastFourDigits"
          required
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          title="Digite os 4 últimos números do cartão"
          className="tabular max-w-32"
          defaultValue={card?.lastFourDigits}
        />
      </Field>

      {type === "CREDIT" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Dia do fechamento" htmlFor="closingDay">
            <Input id="closingDay" name="closingDay" type="number" min={1} max={31} required defaultValue={card?.closingDay ?? ""} />
          </Field>
          <Field label="Dia do vencimento" htmlFor="dueDay">
            <Input id="dueDay" name="dueDay" type="number" min={1} max={31} required defaultValue={card?.dueDay ?? ""} />
          </Field>
          <Field label="Limite" htmlFor="creditLimit">
            <CurrencyInput id="creditLimit" name="creditLimit" defaultValue={card?.creditLimit} />
          </Field>
        </div>
      )}

      <FormError message={error} />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : card ? "Salvar alterações" : "Adicionar cartão"}
        </Button>
      </DialogFooter>
    </form>
  );
}
