"use client";

import { Check } from "lucide-react";
import { useState } from "react";
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
import { callBackend } from "@/lib/call-backend";
import { optionalNumber, optionalText, text } from "@/lib/form-data";
import { CATEGORY_COLORS, categoryColorStyle } from "@/lib/palette";
import type { Category, TransactionType } from "@/lib/types";
import { useFormRequest } from "@/lib/use-request";

export function CategoryDialog({
  category,
  type,
  trigger,
  open,
  onOpenChange,
}: {
  category?: Category;
  // Tipo da nova categoria (na edição, vem da própria categoria)
  type?: TransactionType;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const categoryType = category?.type ?? type ?? "OUTFLOW";

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {category ? "Editar categoria" : categoryType === "OUTFLOW" ? "Nova categoria de saída" : "Nova categoria de entrada"}
          </DialogTitle>
          <DialogDescription>A cor identifica a categoria no extrato e na visão geral.</DialogDescription>
        </DialogHeader>
        {isOpen && (
          <CategoryForm category={category} type={categoryType} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  category,
  type,
  onDone,
}: {
  category?: Category;
  type: TransactionType;
  onDone: () => void;
}) {
  const { error, onSubmit, pending } = useFormRequest(
    async (form) => {
      const body = {
        name: text(form, "name"),
        color: optionalText(form, "color"),
        // Orçamento só existe para saídas; vazio remove
        ...(type === "OUTFLOW" && { monthlyBudget: optionalNumber(form, "monthlyBudget") }),
      };
      if (category) {
        // O tipo da categoria não muda depois de criada
        await callBackend(`/categories/${category.id}`, { method: "PATCH", body });
        return "Categoria atualizada";
      }
      await callBackend("/categories", { method: "POST", body: { ...body, type: text(form, "type") } });
      return "Categoria criada";
    },
    { onSuccess: onDone },
  );
  const [color, setColor] = useState<string>(category?.color ?? CATEGORY_COLORS[0].light);

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="color" value={color} />
      <Field label="Nome" htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          maxLength={50}
          defaultValue={category?.name}
          placeholder={type === "OUTFLOW" ? "Ex.: Mercado" : "Ex.: Salário"}
        />
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Cor</legend>
        <div role="radiogroup" className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map(({ name, light }) => (
            <button
              key={light}
              type="button"
              role="radio"
              aria-checked={color === light}
              aria-label={name}
              onClick={() => setColor(light)}
              style={categoryColorStyle(light)}
              className="grid size-8 place-items-center rounded-full bg-(--c-light) outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring aria-checked:ring-2 aria-checked:ring-foreground dark:bg-(--c-dark)"
            >
              {color === light && <Check className="size-4 text-white" />}
            </button>
          ))}
        </div>
      </fieldset>
      {type === "OUTFLOW" && (
        <Field
          label="Orçamento mensal"
          htmlFor="monthlyBudget"
          hint="Opcional. Você acompanha quanto já gastou dele na visão geral."
        >
          <CurrencyInput id="monthlyBudget" name="monthlyBudget" defaultValue={category?.monthlyBudget} />
        </Field>
      )}
      <FormError message={error} />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : category ? "Salvar alterações" : "Criar categoria"}
        </Button>
      </DialogFooter>
    </form>
  );
}
