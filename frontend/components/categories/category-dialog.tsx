"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
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
import { optionalText, text } from "@/lib/form-data";
import { CATEGORY_COLORS, categoryColorStyle } from "@/lib/palette";
import { cn } from "@/lib/utils";
import { CATEGORY_ICONS, suggestIcon } from "@/lib/category-icons";
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
          <DialogDescription>O ícone e a cor identificam a categoria no extrato e na visão geral.</DialogDescription>
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
        icon: optionalText(form, "icon"),
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
  const [name, setName] = useState(category?.name ?? "");
  // Ícone escolhido à mão; enquanto for null, segue a sugestão pelo nome
  const [pickedIcon, setPickedIcon] = useState<string | null>(category?.icon ?? null);
  const icon = pickedIcon ?? suggestIcon(name);

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="icon" value={icon ?? ""} />
      <Field label="Nome" htmlFor="name">
        <div className="flex items-center gap-3">
          {/* Prévia de como a categoria aparece nas listas */}
          <CategoryIcon category={{ name, icon, color }} />
          <Input
            id="name"
            name="name"
            required
            maxLength={50}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={type === "OUTFLOW" ? "Ex.: Mercado" : "Ex.: Salário"}
          />
        </div>
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Ícone</legend>
        <div role="radiogroup" aria-label="Ícone" className="grid grid-cols-8 gap-1.5">
          {Object.entries(CATEGORY_ICONS).map(([key, { icon: Icon, label }]) => {
            const selected = icon === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={label}
                title={label}
                onClick={() => setPickedIcon(key)}
                style={categoryColorStyle(color)}
                className={cn(
                  "grid aspect-square place-items-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4",
                  selected
                    ? "bg-[color-mix(in_oklab,var(--c-light)_16%,transparent)] text-[color-mix(in_oklab,var(--c-light)_75%,black)] ring-2 ring-(--c-light) dark:bg-[color-mix(in_oklab,var(--c-dark)_24%,transparent)] dark:text-[color-mix(in_oklab,var(--c-dark)_65%,white)] dark:ring-(--c-dark)"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon />
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Cor</legend>
        <div role="radiogroup" aria-label="Cor" className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map(({ name: colorName, light }) => (
            <button
              key={light}
              type="button"
              role="radio"
              aria-checked={color === light}
              aria-label={colorName}
              onClick={() => setColor(light)}
              style={categoryColorStyle(light)}
              className="grid size-8 place-items-center rounded-full bg-(--c-light) outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring aria-checked:ring-2 aria-checked:ring-foreground dark:bg-(--c-dark)"
            >
              {color === light && <Check className="size-4 text-white" />}
            </button>
          ))}
        </div>
      </fieldset>
      <FormError message={error} />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : category ? "Salvar alterações" : "Criar categoria"}
        </Button>
      </DialogFooter>
    </form>
  );
}
