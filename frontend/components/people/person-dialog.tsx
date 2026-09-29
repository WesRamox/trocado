"use client";

import { Check } from "lucide-react";
import { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { callBackend } from "@/lib/call-backend";
import { text } from "@/lib/form-data";
import { CATEGORY_COLORS, categoryColorStyle } from "@/lib/palette";
import type { Person } from "@/lib/types";
import { useFormRequest } from "@/lib/use-request";

// Cria ou edita uma pessoa que usa seus cartões
export function PersonDialog({
  person,
  trigger,
  open,
  onOpenChange,
}: {
  person?: Person;
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{person ? "Editar pessoa" : "Nova pessoa"}</DialogTitle>
          <DialogDescription>Quem usa seus cartões e te reembolsa depois.</DialogDescription>
        </DialogHeader>
        {isOpen && <PersonForm person={person} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function PersonForm({ person, onDone }: { person?: Person; onDone: () => void }) {
  const [name, setName] = useState(person?.name ?? "");
  const [color, setColor] = useState<string>(person?.color ?? CATEGORY_COLORS[4].light);

  const { error, onSubmit, pending } = useFormRequest(
    async (form) => {
      const body = { name: text(form, "name"), color };
      if (person) {
        await callBackend(`/people/${person.id}`, { method: "PATCH", body });
        return "Pessoa atualizada";
      }
      await callBackend("/people", { method: "POST", body });
      return "Pessoa adicionada";
    },
    { onSuccess: onDone },
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Nome" htmlFor="name">
        <div className="flex items-center gap-3">
          <PersonAvatar person={{ id: person?.id ?? 0, name: name || "?", color }} size="md" />
          <Input
            id="name"
            name="name"
            required
            maxLength={50}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Mãe"
          />
        </div>
      </Field>
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
          {pending ? "Salvando..." : person ? "Salvar alterações" : "Adicionar pessoa"}
        </Button>
      </DialogFooter>
    </form>
  );
}
