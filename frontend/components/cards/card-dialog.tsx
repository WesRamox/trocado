"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { CardVisual } from "@/components/cards/card-visual";
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
import { callBackend } from "@/lib/call-backend";
import { CARD_BRANDS } from "@/lib/card-brands";
import { optionalNumber, text } from "@/lib/form-data";
import { CARD_COLORS, cardColor } from "@/lib/palette";
import type { Card, CardBrand, CardType } from "@/lib/types";
import { useFormRequest } from "@/lib/use-request";

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
      <DialogContent className="sm:max-w-2xl">
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

function cardBody(form: FormData) {
  return {
    name: text(form, "name"),
    type: text(form, "type"),
    lastFourDigits: text(form, "lastFourDigits"),
    brand: text(form, "brand"),
    color: text(form, "color"),
    closingDay: optionalNumber(form, "closingDay"),
    dueDay: optionalNumber(form, "dueDay"),
    creditLimit: optionalNumber(form, "creditLimit"),
  };
}

function CardForm({ card, onDone }: { card?: Card; onDone: () => void }) {
  const { error, onSubmit, pending } = useFormRequest(
    async (form) => {
      const body = cardBody(form);
      if (card) {
        await callBackend(`/cards/${card.id}`, { method: "PATCH", body });
        return "Cartão atualizado";
      }
      await callBackend("/cards", { method: "POST", body });
      return "Cartão adicionado";
    },
    { onSuccess: onDone },
  );
  const [type, setType] = useState<CardType>(card?.type ?? "CREDIT");
  const [name, setName] = useState(card?.name ?? "");
  const [lastFourDigits, setLastFourDigits] = useState(card?.lastFourDigits ?? "");
  const [brand, setBrand] = useState<CardBrand>(card?.brand ?? "OTHER");
  // Cartão antigo sem cor salva: começa na cor automática que ele já mostrava
  const [color, setColor] = useState(card ? cardColor(card) : CARD_COLORS[0].hex);
  const [closingDay, setClosingDay] = useState(card?.closingDay ? String(card.closingDay) : "");
  const [dueDay, setDueDay] = useState(card?.dueDay ? String(card.dueDay) : "");

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="color" value={color} />

      {/* Desktop: visual (prévia + cor) à esquerda, campos à direita. Celular: empilhado. */}
      <div className="grid gap-6 sm:grid-cols-[15rem_1fr]">
        <div className="grid content-start gap-4">
          <CardVisual
            className="mx-auto w-full max-w-60"
            card={{
              id: card?.id ?? 0,
              name,
              type,
              brand,
              color,
              lastFourDigits,
              closingDay: Number(closingDay) || null,
              dueDay: Number(dueDay) || null,
            }}
          />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Cor</legend>
            <div role="radiogroup" aria-label="Cor" className="flex flex-wrap gap-1.5">
              {CARD_COLORS.map((option) => (
                <button
                  key={option.hex}
                  type="button"
                  role="radio"
                  aria-checked={color === option.hex}
                  aria-label={option.name}
                  title={option.name}
                  onClick={() => setColor(option.hex)}
                  style={{ backgroundColor: option.hex }}
                  className="grid size-7 place-items-center rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring aria-checked:ring-2 aria-checked:ring-foreground"
                >
                  {color === option.hex && <Check className="size-3.5 text-white" />}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid content-start gap-4">
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <Field label="Nome" htmlFor="name">
              <Input
                id="name"
                name="name"
                required
                maxLength={50}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Nubank"
              />
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

          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <Field label="Bandeira" htmlFor="brand">
              <Select name="brand" value={brand} onValueChange={(value) => setBrand(value as CardBrand)}>
                <SelectTrigger id="brand" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_BRANDS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Final" htmlFor="lastFourDigits">
              <Input
                id="lastFourDigits"
                name="lastFourDigits"
                required
                inputMode="numeric"
                pattern="\d{4}"
                title="Digite os 4 últimos números do cartão"
                placeholder="0000"
                className="tabular"
                value={lastFourDigits}
                // Filtra antes de cortar: colar "1234 5678" ou "90a12" também funciona
                onChange={(event) => setLastFourDigits(event.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </Field>
          </div>

          {type === "CREDIT" && (
            <fieldset className="grid gap-3 border-t pt-4">
              <legend className="sr-only">Fatura</legend>
              <p aria-hidden className="text-sm font-medium">Fatura</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Fecha dia" htmlFor="closingDay">
                  <Input
                    id="closingDay"
                    name="closingDay"
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={closingDay}
                    onChange={(event) => setClosingDay(event.target.value)}
                  />
                </Field>
                <Field label="Vence dia" htmlFor="dueDay">
                  <Input
                    id="dueDay"
                    name="dueDay"
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={dueDay}
                    onChange={(event) => setDueDay(event.target.value)}
                  />
                </Field>
                <Field label="Limite" htmlFor="creditLimit" className="col-span-2 sm:col-span-1">
                  <CurrencyInput id="creditLimit" name="creditLimit" defaultValue={card?.creditLimit} />
                </Field>
              </div>
            </fieldset>
          )}
        </div>
      </div>

      <FormError message={error} />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : card ? "Salvar alterações" : "Adicionar cartão"}
        </Button>
      </DialogFooter>
    </form>
  );
}
