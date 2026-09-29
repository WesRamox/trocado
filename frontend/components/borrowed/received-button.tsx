"use client";

import { Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callBackend } from "@/lib/call-backend";
import { formatMoney, today } from "@/lib/format";
import type { BorrowedPerson } from "@/lib/types";
import { useRequest } from "@/lib/use-request";

// A pessoa pagou o que devia no mês (ou desfaz, se marcou sem querer)
export function ReceivedButton({ row, month }: { row: BorrowedPerson; month: string }) {
  const { run, pending } = useRequest();
  const path = `/borrowed/${row.person.id}/${month}/received`;

  if (row.pending > 0) {
    return (
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          run(async () => {
            await callBackend(path, { method: "PUT", body: { date: today() } });
            return `${formatMoney(row.pending)} de ${row.person.name} recebidos`;
          })
        }
      >
        <Check /> Recebi
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        run(async () => {
          await callBackend(path, { method: "DELETE" });
          return "Recebimento desfeito";
        })
      }
    >
      <Undo2 /> Desfazer
    </Button>
  );
}
