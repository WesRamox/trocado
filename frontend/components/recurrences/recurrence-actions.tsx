"use client";

import { CircleStop, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { RecurrenceDialog } from "@/components/recurrences/recurrence-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { callBackend } from "@/lib/call-backend";
import { today } from "@/lib/format";
import type { Card, Category, Recurrence } from "@/lib/types";
import { useRequest } from "@/lib/use-request";

export function RecurrenceActions({
  recurrence,
  cards,
  categories,
  ended,
}: {
  recurrence: Recurrence;
  cards: Card[];
  categories: Category[];
  ended: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState<"end" | "delete" | null>(null);
  const { run, pending } = useRequest();

  // Encerrar = definir a data de fim; os lançamentos já gerados continuam
  const end = () =>
    run(
      async () => {
        await callBackend(`/recurrences/${recurrence.id}`, { method: "PATCH", body: { endDate: today() } });
        return "Recorrência encerrada";
      },
      { onSuccess: () => setConfirming(null) },
    );

  const remove = () =>
    run(
      async () => {
        await callBackend(`/recurrences/${recurrence.id}`, { method: "DELETE" });
        return "Recorrência excluída";
      },
      { onSuccess: () => setConfirming(null) },
    );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${recurrence.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil /> Editar
          </DropdownMenuItem>
          {!ended && (
            <DropdownMenuItem onSelect={() => setConfirming("end")}>
              <CircleStop /> Encerrar hoje
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirming("delete")}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RecurrenceDialog
        cards={cards}
        categories={categories}
        recurrence={recurrence}
        open={editing}
        onOpenChange={setEditing}
      />

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming === "end" ? `Encerrar “${recurrence.name}”?` : `Excluir “${recurrence.name}”?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirming === "end"
                ? "Não serão criados novos lançamentos a partir de amanhã. Os que já existem continuam no extrato."
                : "A regra é apagada, mas os lançamentos que ela já criou continuam no extrato. Para só parar de repetir, use Encerrar."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            {confirming === "end" ? (
              <Button disabled={pending} onClick={end}>
                Encerrar
              </Button>
            ) : (
              <Button
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={pending}
                onClick={remove}
              >
                Excluir recorrência
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
