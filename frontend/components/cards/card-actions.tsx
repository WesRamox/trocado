"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { CardDialog } from "@/components/cards/card-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { callBackend } from "@/lib/call-backend";
import type { Card } from "@/lib/types";
import { useRequest } from "@/lib/use-request";

export function CardActions({ card }: { card: Card }) {
  const router = useRouter();
  const { run, pending } = useRequest();

  // Sem refresh: a página do cartão deixa de existir, então volta para a lista
  const remove = () =>
    run(
      async () => {
        await callBackend(`/cards/${card.id}`, { method: "DELETE" });
        return "Cartão excluído";
      },
      { onSuccess: () => router.push("/cartoes"), refresh: false },
    );

  return (
    <div className="flex gap-2">
      <CardDialog
        card={card}
        trigger={
          <Button variant="outline">
            <Pencil /> Editar
          </Button>
        }
      />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 /> Excluir
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o cartão {card.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lançamentos feitos com ele continuam no extrato, só deixam de estar ligados ao cartão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button className="bg-destructive text-white hover:bg-destructive/90" disabled={pending} onClick={remove}>
              Excluir cartão
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
