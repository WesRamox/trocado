"use client";

import { useEffect, useState } from "react";
import { CurrencyInput } from "@/components/currency-input";
import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ApiError, callBackend } from "@/lib/call-backend";
import { formatDate, formatMoney, monthName } from "@/lib/format";
import { requireAmount } from "@/lib/form-data";
import type { Card, Invoice } from "@/lib/types";
import { useFormRequest, useRequest } from "@/lib/use-request";

// Informar só o total da fatura, sem lançar cada compra. O que já está lançado nela
// (recorrências, compras detalhadas) é descontado: só a diferença entra como "sem detalhe".
export function InvoiceTotalDialog({
  card,
  month,
  trigger,
  open,
  onOpenChange,
}: {
  card: Card;
  // Mês de vencimento da fatura, 'YYYY-MM'
  month: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Total da fatura de {monthName(month)}</DialogTitle>
          <DialogDescription>
            Não quer lançar cada compra do {card.name}? Informe só o total, como aparece no app do banco.
          </DialogDescription>
        </DialogHeader>
        {isOpen && <InvoiceTotalForm card={card} month={month} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function InvoiceTotalForm({ card, month, onDone }: { card: Card; month: string; onDone: () => void }) {
  const path = `/cards/${card.id}/invoices/${month}`;
  const [invoice, setInvoice] = useState<Invoice>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    callBackend<Invoice>(path).then(setInvoice, (error) =>
      setLoadError(error instanceof ApiError ? error.message : "Não foi possível carregar a fatura."),
    );
  }, [path]);

  const { error, onSubmit, pending } = useFormRequest(
    async (form) => {
      await callBackend(`${path}/total`, { method: "PUT", body: { total: requireAmount(form) } });
      return "Total da fatura salvo";
    },
    { onSuccess: onDone },
  );
  const removal = useRequest();

  if (loadError) return <FormError message={loadError} />;
  if (!invoice) return <p className="py-6 text-center text-sm text-muted-foreground">Carregando a fatura...</p>;

  const remainder = invoice.transactions.find((t) => t.invoiceRemainder);
  const detailed = invoice.total - (remainder?.amount ?? 0);
  const detailedCount = invoice.transactions.length - (remainder ? 1 : 0);

  const removeRemainder = () =>
    removal.run(
      async () => {
        await callBackend(`${path}/total`, { method: "DELETE" });
        return "Valor sem detalhe removido";
      },
      { onSuccess: onDone },
    );

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Total da fatura" htmlFor="amount" hint={`Vence em ${formatDate(invoice.dueDate)}.`}>
        {/* Ajustar começa do total atual; informar pela primeira vez começa vazio */}
        <CurrencyInput id="amount" name="amount" defaultValue={remainder ? invoice.total : undefined} />
      </Field>

      <p className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
        {detailedCount > 0 ? (
          <>
            Já há <span className="tabular font-medium text-foreground">{formatMoney(detailed)}</span> lançados nesta
            fatura ({detailedCount} {detailedCount === 1 ? "item" : "itens"}). Só a diferença entra como “sem detalhe”,
            para nada ser contado em dobro.
          </>
        ) : (
          <>O valor entra como um lançamento “sem detalhe” no último dia de compras desta fatura.</>
        )}
      </p>

      <FormError message={error} />
      <DialogFooter className="gap-2">
        {remainder && (
          <Button type="button" variant="outline" disabled={pending || removal.pending} onClick={removeRemainder}>
            Remover valor sem detalhe
          </Button>
        )}
        <Button type="submit" disabled={pending || removal.pending}>
          {pending ? "Salvando..." : "Salvar total"}
        </Button>
      </DialogFooter>
    </form>
  );
}
