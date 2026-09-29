"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { PersonDialog } from "@/components/people/person-dialog";
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
import type { Person } from "@/lib/types";
import { useRequest } from "@/lib/use-request";

export function PersonActions({ person }: { person: Person }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { run, pending } = useRequest();

  const remove = () =>
    run(
      async () => {
        await callBackend(`/people/${person.id}`, { method: "DELETE" });
        return "Pessoa excluída";
      },
      { onSuccess: () => setDeleting(false) },
    );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${person.name}`}>
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

      <PersonDialog person={person} open={editing} onOpenChange={setEditing} />

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {person.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              As compras dela continuam nos cartões, mas voltam a contar como gastos seus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button className="bg-destructive text-white hover:bg-destructive/90" disabled={pending} onClick={remove}>
              Excluir pessoa
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
