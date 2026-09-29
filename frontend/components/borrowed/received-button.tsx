"use client";

import { Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChargeGroup } from "@/lib/borrowed";
import { callBackend } from "@/lib/call-backend";
import { formatMoney, today } from "@/lib/format";
import type { Person } from "@/lib/types";
import { useRequest } from "@/lib/use-request";

// A pessoa pagou o que devia num dia de cobrança (ou desfaz, se marcou sem querer)
export function ReceivedButton({ person, month, group }: { person: Person; month: string; group: ChargeGroup }) {
  const { run, pending } = useRequest();
  const path = `/borrowed/${person.id}/${month}/received`;
  const ids = group.items.map((t) => t.id);

  if (group.pending !== 0) {
    return (
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          run(async () => {
            await callBackend(path, { method: "PUT", body: { date: today(), ids } });
            return `${formatMoney(group.pending)} de ${person.name} recebidos`;
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
          await callBackend(path, { method: "DELETE", query: { ids: ids.join(",") } });
          return "Recebimento desfeito";
        })
      }
    >
      <Undo2 /> Desfazer
    </Button>
  );
}
