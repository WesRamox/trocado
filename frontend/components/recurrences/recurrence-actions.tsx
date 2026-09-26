"use client";

import { CircleStop, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteRecurrence, endRecurrence } from "@/app/(app)/recorrencias/actions";
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
import { today } from "@/lib/format";
import type { ActionState, Card, Category, Recurrence } from "@/lib/types";

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
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionState>) =>
    startTransition(async () => {
      const result = await action();
      if (result?.ok) {
        toast.success(result.message);
        setConfirming(null);
      } else if (result) {
        toast.error(result.message);
      }
    });

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
              <Button disabled={pending} onClick={() => run(() => endRecurrence(recurrence.id, today()))}>
                Encerrar
              </Button>
            ) : (
              <Button
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={pending}
                onClick={() => run(() => deleteRecurrence(recurrence.id))}
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
