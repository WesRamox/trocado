"use client";

import { CategoryIcon } from "@/components/category-icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Card, Category, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

// Controles compartilhados pelos formulários de lançamento e de recorrência

// Alternância Saída / Entrada, enviada como campo "type"
export function TypeToggle({
  value,
  onChange,
}: {
  value: TransactionType;
  onChange: (value: TransactionType) => void;
}) {
  const options = [
    { value: "OUTFLOW", label: "Saída", active: "bg-outflow text-white" },
    { value: "INFLOW", label: "Entrada", active: "bg-inflow text-white" },
  ] as const;

  return (
    <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
      <input type="hidden" name="type" value={value} />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md py-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            value === option.value && option.active,
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Só mostra categorias do tipo escolhido; "none" = sem categoria
export function CategorySelect({
  categories,
  type,
  defaultValue,
}: {
  categories: Category[];
  type: TransactionType;
  defaultValue?: number | null;
}) {
  const options = categories.filter((category) => category.type === type);
  const initial = options.some((category) => category.id === defaultValue) ? String(defaultValue) : "none";

  return (
    // key: ao trocar o tipo, volta para "Sem categoria"
    <Select key={type} name="categoryId" defaultValue={initial}>
      <SelectTrigger id="categoryId" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sem categoria</SelectItem>
        {options.map((category) => (
          <SelectItem key={category.id} value={String(category.id)}>
            <CategoryIcon category={category} size="xs" />
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CardSelect({
  cards,
  value,
  onValueChange,
}: {
  cards: Card[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select name="cardId" value={value} onValueChange={onValueChange}>
      <SelectTrigger id="cardId" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sem cartão</SelectItem>
        {cards.map((card) => (
          <SelectItem key={card.id} value={String(card.id)}>
            {card.name} •••• {card.lastFourDigits}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
