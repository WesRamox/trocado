"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";

const MAX_CENTS = 2_000_000_000; // R$ 20.000.000,00, o teto da API

// Campo de valor em reais no estilo de app de banco: os dígitos entram pela direita.
// Envia no formulário o valor em reais com ponto decimal (ex.: "150.75").
export function CurrencyInput({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue?: number | null;
}) {
  const [cents, setCents] = useState(defaultValue ? Math.round(defaultValue * 100) : 0);
  const ref = useRef<HTMLInputElement>(null);

  // O cursor fica sempre no fim: assim o dígito digitado é sempre o último,
  // mesmo depois de o valor ser reformatado ("R$ 0,02" -> "R$ 0,23")
  const moveCaretToEnd = () => {
    const input = ref.current;
    if (input && document.activeElement === input) {
      input.setSelectionRange(input.value.length, input.value.length);
    }
  };
  useLayoutEffect(moveCaretToEnd, [cents]);

  return (
    <>
      <Input
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className="tabular"
        value={formatMoney(cents / 100)}
        onFocus={moveCaretToEnd}
        onClick={moveCaretToEnd}
        // Dígitos entram pela direita e Backspace remove o último, onde quer que esteja o cursor
        onKeyDown={(event) => {
          if (/^\d$/.test(event.key)) {
            event.preventDefault();
            setCents((current) => Math.min(current * 10 + Number(event.key), MAX_CENTS));
          } else if (event.key === "Backspace" || event.key === "Delete") {
            event.preventDefault();
            setCents((current) => Math.floor(current / 10));
          }
        }}
        // Colar e teclados virtuais que não informam a tecla
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          setCents(Math.min(Number(digits || 0), MAX_CENTS));
        }}
      />
      <input type="hidden" name={name} value={cents ? (cents / 100).toFixed(2) : ""} />
    </>
  );
}
