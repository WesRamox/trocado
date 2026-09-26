"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteTransaction } from "@/app/(app)/lancamentos/actions";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
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
import type { Card, Category, Transaction } from "@/lib/types";

export function TransactionActions({
  transaction,
  cards,
  categories,
}: {
  transaction: Transaction;
  cards: Card[];
  categories: Category[];
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, startTransition] = useTransition();
  const isInstallment = transaction.installmentGroupId !== null;

  const remove = (allInstallments: boolean) =>
    startTransition(async () => {
      const result = await deleteTransaction(transaction.id, allInstallments);
      if (result?.ok) {
        toast.success(result.message);
        setDeleting(false);
      } else if (result) {
        toast.error(result.message);
      }
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${transaction.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TransactionDialog
        cards={cards}
        categories={categories}
        transaction={transaction}
        open={editing}
        onOpenChange={setEditing}
      />

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{transaction.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {isInstallment
                ? `Esta é a parcela ${transaction.installmentNumber} de ${transaction.installmentCount}. Você pode excluir só ela ou a compra inteira.`
                : "Essa ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            {isInstallment && (
              <Button variant="outline" disabled={pending} onClick={() => remove(false)}>
                Excluir só esta parcela
              </Button>
            )}
            <Button
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={pending}
              onClick={() => remove(isInstallment)}
            >
              {isInstallment ? "Excluir todas as parcelas" : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
