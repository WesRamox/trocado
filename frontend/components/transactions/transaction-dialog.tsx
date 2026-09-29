"use client";

import { useRef, useState, type FormEvent } from "react";
import { CurrencyInput } from "@/components/currency-input";
import { Field, FormError } from "@/components/field";
import { CardSelect, CategorySelect, PersonSelect, TypeToggle } from "@/components/form-controls";
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
import { optionalId, optionalText, requireAmount, text } from "@/lib/form-data";
import { formatDate, formatMoney, today } from "@/lib/format";
import type { Card, Category, Person, RecurrenceMatch, Transaction, TransactionType } from "@/lib/types";
import { useFormRequest } from "@/lib/use-request";
import { cn } from "@/lib/utils";

interface Props {
  cards: Card[];
  categories: Category[];
  people: Person[];
  // Sem transaction = criação
  transaction?: Transaction;
  // Na criação: já começa como compra desta pessoa
  defaultPersonId?: number;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TransactionDialog({
  cards,
  categories,
  people,
  transaction,
  defaultPersonId,
  trigger,
  open,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{transaction ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          <DialogDescription>
            {transaction?.installmentCount
              ? `Parcela ${transaction.installmentNumber} de ${transaction.installmentCount}. As alterações valem só para esta parcela.`
              : "Registre uma despesa ou uma entrada."}
          </DialogDescription>
        </DialogHeader>
        {/* Montado só enquanto aberto: os campos começam limpos a cada abertura */}
        {isOpen && (
          <TransactionForm
            cards={cards}
            categories={categories}
            people={people}
            transaction={transaction}
            defaultPersonId={defaultPersonId}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function transactionBody(form: FormData) {
  return {
    type: text(form, "type"),
    name: text(form, "name"),
    amount: requireAmount(form),
    date: text(form, "date"),
    description: optionalText(form, "description"),
    cardId: optionalId(form, "cardId"),
    categoryId: optionalId(form, "categoryId"),
    // Entradas não têm dono: o campo nem aparece
    personId: text(form, "type") === "OUTFLOW" ? optionalId(form, "personId") : null,
  };
}

function TransactionForm({
  cards,
  categories,
  people,
  transaction,
  defaultPersonId,
  onDone,
}: Omit<Props, "trigger" | "open" | "onOpenChange"> & { onDone: () => void }) {
  const { error, onSubmit, pending } = useFormRequest(
    async (form) => {
      const body = transactionBody(form);
      if (transaction) {
        await callBackend(`/transactions/${transaction.id}`, { method: "PATCH", body });
        return "Lançamento atualizado";
      }
      const installments = Number(text(form, "installments") || 1);
      await callBackend("/transactions", {
        method: "POST",
        body: { ...body, ...(installments > 1 && { installments }) },
      });
      return installments > 1 ? `Lançamento criado em ${installments} parcelas` : "Lançamento criado";
    },
    { onSuccess: onDone },
  );

  // Antes de criar, confere se o lançamento não repete uma recorrência (que já entra sozinha)
  const formRef = useRef<HTMLFormElement>(null);
  const checkedRef = useRef(false);
  const [matches, setMatches] = useState<RecurrenceMatch[]>([]);
  const [checking, setChecking] = useState(false);

  const submitChecked = () => {
    checkedRef.current = true;
    formRef.current?.requestSubmit();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (transaction || checkedRef.current) {
      checkedRef.current = false;
      onSubmit(event);
      return;
    }
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(text(form, "amount"));
    // Sem valor, o envio normal mostra o erro do campo
    if (!(amount > 0)) return submitChecked();

    setChecking(true);
    callBackend<RecurrenceMatch[]>("/transactions/recurrence-matches", {
      query: { date: text(form, "date"), amount, type: text(form, "type") },
    })
      // Se a conferência falhar, não impede o lançamento
      .catch((): RecurrenceMatch[] => [])
      .then((found) => {
        setChecking(false);
        if (found.length > 0) setMatches(found);
        else submitChecked();
      });
  };

  const [type, setType] = useState<TransactionType>(transaction?.type ?? "OUTFLOW");
  const [cardId, setCardId] = useState(transaction?.cardId ? String(transaction.cardId) : "none");
  const selectedCard = cards.find((card) => String(card.id) === cardId);
  // Só despesas podem ser de outra pessoa
  const showPerson = type === "OUTFLOW" && people.length > 0;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
      <TypeToggle value={type} onChange={setType} />

      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <Field label="Descrição" htmlFor="name">
          <Input
            id="name"
            name="name"
            required
            maxLength={100}
            defaultValue={transaction?.name}
            placeholder={type === "OUTFLOW" ? "Ex.: Mercado" : "Ex.: Salário"}
          />
        </Field>
        <Field label={transaction || type === "INFLOW" ? "Valor" : "Valor total"} htmlFor="amount">
          <CurrencyInput id="amount" name="amount" defaultValue={transaction?.amount} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data" htmlFor="date">
          <Input id="date" name="date" type="date" required defaultValue={transaction?.date ?? today()} />
        </Field>
        <Field label="Categoria" htmlFor="categoryId">
          <CategorySelect categories={categories} type={type} defaultValue={transaction?.categoryId} />
        </Field>
      </div>

      <div className="grid grid-cols-[1fr_6rem] gap-4 sm:grid-cols-2">
        <Field label="Cartão" htmlFor="cardId">
          <CardSelect cards={cards} value={cardId} onValueChange={setCardId} />
        </Field>
        {!transaction && type === "OUTFLOW" && (
          <Field label="Parcelas" htmlFor="installments">
            <Input id="installments" name="installments" type="number" min={1} max={120} defaultValue={1} />
          </Field>
        )}
      </div>
      {/* Dica em linha inteira: na coluna estreita das parcelas ficaria espremida no celular */}
      {!transaction && type === "OUTFLOW" && selectedCard?.type === "CREDIT" && (
        <p className="-mt-2 text-xs text-muted-foreground">
          No crédito, cada parcela entra na fatura do mês seguinte à anterior.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {showPerson && (
          <Field
            label="De quem é"
            htmlFor="personId"
            hint={
              transaction?.installmentCount
                ? "Vale para todas as parcelas."
                : "De outra pessoa: não conta nos seus gastos."
            }
          >
            <PersonSelect people={people} defaultValue={transaction ? transaction.personId : defaultPersonId} />
          </Field>
        )}
        <Field label="Observação" htmlFor="description" className={cn(!showPerson && "sm:col-span-2")}>
          <Input
            id="description"
            name="description"
            maxLength={500}
            defaultValue={transaction?.description ?? ""}
            placeholder="Opcional"
          />
        </Field>
      </div>

      {matches.length > 0 && <RepeatWarning match={matches[0]} />}

      <FormError message={error} />
      <DialogFooter>
        {matches.length > 0 ? (
          <>
            <Button type="button" variant="outline" disabled={pending} onClick={onDone}>
              Não lançar
            </Button>
            <Button type="button" disabled={pending} onClick={submitChecked}>
              {pending ? "Salvando..." : "Lançar mesmo assim"}
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={pending || checking}>
            {pending || checking ? "Salvando..." : transaction ? "Salvar alterações" : "Criar lançamento"}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

// O lançamento parece repetir uma recorrência: ela já entra sozinha nos cálculos
function RepeatWarning({ match }: { match: RecurrenceMatch }) {
  return (
    <div role="alert" className="rounded-lg border border-gold/60 bg-gold/15 px-3 py-2.5 text-sm">
      <p className="font-medium">Isso não é a recorrência “{match.name}”?</p>
      <p className="mt-0.5 text-muted-foreground">
        {match.projected ? "Ela já está prevista com" : "Ela já lançou"}{" "}
        <span className="tabular font-medium text-foreground">{formatMoney(match.amount)}</span> em{" "}
        {formatDate(match.date)} e entra sozinha nos cálculos. Lançar de novo contaria em dobro.
      </p>
    </div>
  );
}
