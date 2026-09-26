"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { InvoiceTotalDialog } from "@/components/cards/invoice-total-dialog";
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
import { callBackend } from "@/lib/call-backend";
import type { Card, Category, Transaction } from "@/lib/types";
import { useRequest } from "@/lib/use-request";

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
  const { run, pending } = useRequest();
  const isInstallment = transaction.installmentGroupId !== null;
  // Valor "sem detalhe" de uma fatura: ajustado pelo total da fatura, não editado como lançamento
  const remainderCard = transaction.invoiceRemainder ? cards.find((card) => card.id === transaction.cardId) : undefined;

  const remove = (allInstallments: boolean) =>
    run(
      async () => {
        await callBackend(`/transactions/${transaction.id}`, { method: "DELETE", query: { allInstallments } });
        return allInstallments ? "Parcelas excluídas" : "Lançamento excluído";
      },
      { onSuccess: () => setDeleting(false) },
    );

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
            <Pencil /> {remainderCard ? "Ajustar total da fatura" : "Editar"}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {remainderCard && transaction.invoiceDueDate ? (
        <InvoiceTotalDialog
          card={remainderCard}
          month={transaction.invoiceDueDate.slice(0, 7)}
          open={editing}
          onOpenChange={setEditing}
        />
      ) : (
        <TransactionDialog
          cards={cards}
          categories={categories}
          transaction={transaction}
          open={editing}
          onOpenChange={setEditing}
        />
      )}

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
