"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { callBackend } from "@/lib/call-backend";
import { formatDate, formatMoney, monthName, today } from "@/lib/format";
import { requireAmount, text } from "@/lib/form-data";
import type { Card, Invoice } from "@/lib/types";
import { useFormRequest, useRequest } from "@/lib/use-request";

// Registra o pagamento (total ou parcial) de uma fatura. Pagar não é um gasto novo:
// as compras já estão lançadas; o pagamento só abate o que falta e libera o limite.
export function InvoicePaymentDialog({
  card,
  invoice,
  trigger,
}: {
  card: Card;
  invoice: Invoice;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar fatura de {monthName(invoice.month)}</DialogTitle>
          <DialogDescription>
            O pagamento libera o limite do {card.name}. Não entra como gasto: as compras da fatura já estão lançadas.
          </DialogDescription>
        </DialogHeader>
        {open && <InvoicePaymentForm card={card} invoice={invoice} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function InvoicePaymentForm({ card, invoice, onDone }: { card: Card; invoice: Invoice; onDone: () => void }) {
  const path = `/cards/${card.id}/invoices/${invoice.month}/payments`;
  const isPaid = invoice.remaining === 0;

  const { error, onSubmit, pending } = useFormRequest(
    async (form) => {
      await callBackend(path, { method: "POST", body: { amount: requireAmount(form), date: text(form, "date") } });
      return "Pagamento registrado";
    },
    { onSuccess: onDone },
  );
  const removal = useRequest();

  const removePayment = (id: number) =>
    removal.run(async () => {
      await callBackend(`${path}/${id}`, { method: "DELETE" });
      return "Pagamento excluído";
    });

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
        <div>
          <dt className="text-muted-foreground">Fatura</dt>
          <dd className="tabular font-medium">{formatMoney(invoice.total)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Pago</dt>
          <dd className="tabular font-medium">{formatMoney(invoice.paid)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Falta</dt>
          <dd className="tabular font-medium">{formatMoney(invoice.remaining)}</dd>
        </div>
      </dl>

      {invoice.payments.length > 0 && (
        <ul className="grid gap-1 text-sm">
          {invoice.payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Pago em {formatDate(payment.date)}</span>
              <span className="flex items-center gap-1">
                <span className="tabular font-medium">{formatMoney(payment.amount)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Excluir pagamento de ${formatMoney(payment.amount)}`}
                  disabled={removal.pending}
                  onClick={() => removePayment(payment.id)}
                >
                  <Trash2 />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {isPaid ? (
        <p className="text-sm text-muted-foreground">Esta fatura já está paga.</p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor pago" htmlFor="amount" hint="Pode ser só uma parte.">
              <CurrencyInput id="amount" name="amount" defaultValue={invoice.remaining} />
            </Field>
            <Field label="Data do pagamento" htmlFor="date">
              <Input id="date" name="date" type="date" required defaultValue={today()} />
            </Field>
          </div>
          <FormError message={error} />
          <DialogFooter>
            <Button type="submit" disabled={pending || removal.pending}>
              {pending ? "Registrando..." : "Registrar pagamento"}
            </Button>
          </DialogFooter>
        </form>
      )}
    </div>
  );
}
