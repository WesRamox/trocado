"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { CategoryDialog } from "@/components/categories/category-dialog";
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
import type { Category } from "@/lib/types";
import { useRequest } from "@/lib/use-request";

export function CategoryActions({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { run, pending } = useRequest();

  const remove = () =>
    run(
      async () => {
        await callBackend(`/categories/${category.id}`, { method: "DELETE" });
        return "Categoria excluída";
      },
      { onSuccess: () => setDeleting(false) },
    );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${category.name}`}>
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

      <CategoryDialog category={category} open={editing} onOpenChange={setEditing} />

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a categoria {category.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lançamentos dela continuam no extrato, mas ficam sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button className="bg-destructive text-white hover:bg-destructive/90" disabled={pending} onClick={remove}>
              Excluir categoria
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
