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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { callBackend } from "@/lib/call-backend";
import { optionalId, optionalText, requireAmount, text } from "@/lib/form-data";
import { today } from "@/lib/format";
import { describeSchedule, FREQUENCY_OPTIONS } from "@/lib/recurrence";
import type { Card, Category, Recurrence, RecurrenceFrequency, TransactionType } from "@/lib/types";
import { useFormRequest } from "@/lib/use-request";

interface Props {
  cards: Card[];
  categories: Category[];
  // Sem recurrence = criação
  recurrence?: Recurrence;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RecurrenceDialog({ cards, categories, recurrence, trigger, open, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{recurrence ? "Editar recorrência" : "Nova recorrência"}</DialogTitle>
          <DialogDescription>
            {recurrence
              ? `${describeSchedule(recurrence)}. As alterações valem para os próximos lançamentos.`
              : "Contas e entradas que se repetem viram lançamentos automaticamente na data certa."}
          </DialogDescription>
        </DialogHeader>
        {isOpen && (
          <RecurrenceForm
            cards={cards}
            categories={categories}
            recurrence={recurrence}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Campos que podem mudar depois de criada
function editableBody(form: FormData) {
  return {
    name: text(form, "name"),
    amount: requireAmount(form),
    description: optionalText(form, "description"),
    endDate: optionalText(form, "endDate"),
    cardId: optionalId(form, "cardId"),
    categoryId: optionalId(form, "categoryId"),
  };
}

function RecurrenceForm({
  cards,
  categories,
  recurrence,
  onDone,
}: Omit<Props, "trigger" | "open" | "onOpenChange"> & { onDone: () => void }) {
  const { error, onSubmit, pending } = useFormRequest(
    async (form) => {
      const body = editableBody(form);
      if (recurrence) {
        await callBackend(`/recurrences/${recurrence.id}`, { method: "PATCH", body });
        return "Recorrência atualizada";
      }
      await callBackend("/recurrences", {
        method: "POST",
        body: {
          ...body,
          type: text(form, "type"),
          frequency: text(form, "frequency"),
          interval: Number(text(form, "interval") || 1),
          startDate: text(form, "startDate"),
        },
      });
      return "Recorrência criada";
    },
    { onSuccess: onDone },
  );

  const [type, setType] = useState<TransactionType>(recurrence?.type ?? "OUTFLOW");
  const [cardId, setCardId] = useState(recurrence?.cardId ? String(recurrence.cardId) : "none");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("MONTHLY");
  const [every, setEvery] = useState("1");
  const unit = FREQUENCY_OPTIONS.find((option) => option.value === frequency)!.unit;

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {/* Tipo, frequência e início só são escolhidos na criação */}
      {!recurrence && <TypeToggle value={type} onChange={setType} />}

      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <Field label="Descrição" htmlFor="name">
          <Input
            id="name"
            name="name"
            required
            maxLength={100}
            defaultValue={recurrence?.name}
            placeholder={type === "OUTFLOW" ? "Ex.: Aluguel" : "Ex.: Salário"}
          />
        </Field>
        <Field label="Valor" htmlFor="amount">
          <CurrencyInput id="amount" name="amount" defaultValue={recurrence?.amount} />
        </Field>
      </div>

      {!recurrence && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Repete" htmlFor="frequency">
            <Select
              name="frequency"
              value={frequency}
              onValueChange={(value) => setFrequency(value as RecurrenceFrequency)}
            >
              <SelectTrigger id="frequency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="A cada" htmlFor="interval">
            <div className="flex items-center gap-2">
              <Input
                id="interval"
                name="interval"
                type="number"
                min={1}
                max={365}
                required
                className="w-16"
                value={every}
                onChange={(event) => setEvery(event.target.value)}
              />
              {/* "1 mês", "3 meses" */}
              <span className="text-muted-foreground">{every === "1" ? unit[0] : unit[1]}</span>
            </div>
          </Field>
          <Field label="Primeira vez em" htmlFor="startDate" className="col-span-2 sm:col-span-1">
            <Input id="startDate" name="startDate" type="date" required defaultValue={today()} />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Categoria" htmlFor="categoryId">
          <CategorySelect categories={categories} type={type} defaultValue={recurrence?.categoryId} />
        </Field>
        <Field label="Cartão" htmlFor="cardId">
          <CardSelect cards={cards} value={cardId} onValueChange={setCardId} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Termina em" htmlFor="endDate" hint="Deixe vazio para repetir sem data de fim.">
          <Input
            id="endDate"
            name="endDate"
            type="date"
            min={recurrence?.startDate}
            defaultValue={recurrence?.endDate ?? ""}
          />
        </Field>
        <Field label="Observação" htmlFor="description">
          <Input
            id="description"
            name="description"
            maxLength={500}
            defaultValue={recurrence?.description ?? ""}
            placeholder="Opcional"
          />
        </Field>
      </div>

      <FormError message={error} />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : recurrence ? "Salvar alterações" : "Criar recorrência"}
        </Button>
      </DialogFooter>
    </form>
  );
}
