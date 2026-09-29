import { CalendarClock, Landmark, Percent, Plus, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { StatTile } from "@/components/dashboard/stat-tile";
import { EmptyState } from "@/components/empty-state";
import { LoanActions } from "@/components/loans/loan-actions";
import { LoanDialog } from "@/components/loans/loan-dialog";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { callBackend } from "@/lib/call-backend";
import { formatDate, formatMoney, formatMonthlyRate, monthShort } from "@/lib/format";
import type { Category, Loan } from "@/lib/types";

export const metadata: Metadata = { title: "Empréstimos" };

// '2026-06-10' -> "jun/2026"
const monthYear = (date: string) => `${monthShort(date.slice(0, 7))}/${date.slice(0, 4)}`;

export default async function LoansPage() {
  const [loans, categories] = await Promise.all([
    callBackend<Loan[]>("/loans"),
    callBackend<Category[]>("/categories"),
  ]);

  const newButton = (
    <LoanDialog
      categories={categories}
      trigger={
        <Button>
          <Plus /> Novo empréstimo
        </Button>
      }
    />
  );
  const header = (
    <PageHeader
      title="Empréstimos"
      icon={Landmark}
      tone="sky"
      description="Empréstimos com o banco: quanto falta pagar e quanto custam de juros."
      actions={loans.length > 0 ? newButton : undefined}
    />
  );

  if (loans.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={Landmark}
          tone="sky"
          title="Nenhum empréstimo"
          description="Cadastre o total a pagar, as parcelas e a data da 1ª. As parcelas entram sozinhas nos seus lançamentos."
          action={newButton}
        />
      </>
    );
  }

  // Quitados por último
  const sorted = [...loans].sort((a, b) => Number(a.remaining === 0) - Number(b.remaining === 0));
  const active = loans.filter((loan) => loan.remaining > 0);
  const remaining = active.reduce((sum, loan) => sum + loan.remaining, 0);
  const monthly = active.reduce((sum, loan) => sum + loan.installmentAmount, 0);
  const withInterest = loans.filter((loan) => loan.interest !== null);
  const interest = withInterest.reduce((sum, loan) => sum + loan.interest!, 0);

  return (
    <>
      {header}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Saldo devedor"
          icon={Wallet}
          tone="coral"
          value={formatMoney(remaining)}
          detail="Parcelas que ainda vão vencer"
        />
        <StatTile
          label="Parcelas por mês"
          icon={CalendarClock}
          tone="violet"
          value={formatMoney(monthly)}
          detail={`${active.length} ${active.length === 1 ? "empréstimo em aberto" : "empréstimos em aberto"}`}
        />
        <StatTile
          label="Juros no total"
          icon={Percent}
          tone="gold"
          value={withInterest.length > 0 ? formatMoney(interest) : "—"}
          detail={
            withInterest.length < loans.length
              ? "Informe o valor recebido de cada empréstimo para ver os juros"
              : "O que você paga a mais do que recebeu"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sorted.map((loan) => (
          <LoanCard key={loan.id} loan={loan} categories={categories} />
        ))}
      </div>
    </>
  );
}

function LoanCard({ loan, categories }: { loan: Loan; categories: Category[] }) {
  const done = loan.remaining === 0;
  const progress = loan.paidCount / loan.installments;

  return (
    <section className="rounded-xl border bg-card p-4">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{loan.name}</span>
            {done && (
              <Badge variant="secondary" className="font-normal">
                Quitado
              </Badge>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {loan.installments}× de {formatMoney(loan.installmentAmount)} · {monthYear(loan.firstDueDate)} a{" "}
            {monthYear(loan.lastDueDate)}
          </p>
        </div>
        <LoanActions loan={loan} categories={categories} />
      </header>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">{done ? "Total pago" : "Falta pagar"}</p>
          <p className="tabular text-2xl font-semibold tracking-tight">
            {formatMoney(done ? loan.paid : loan.remaining)}
          </p>
        </div>
        {loan.nextDueDate && (
          <p className="text-right text-xs text-muted-foreground">
            Próxima parcela
            <span className="block text-sm font-medium text-foreground">{formatDate(loan.nextDueDate)}</span>
          </p>
        )}
      </div>

      <div className="mt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${loan.paidCount} de ${loan.installments} parcelas pagas`}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {loan.paidCount} de {loan.installments} parcelas pagas ({formatMoney(loan.paid)} de {formatMoney(loan.total)})
        </p>
      </div>

      {loan.received !== null && loan.interest !== null && (
        <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-xs">
          <div>
            <dt className="text-muted-foreground">Recebido</dt>
            <dd className="tabular text-sm font-medium">{formatMoney(loan.received)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Juros</dt>
            <dd className="tabular text-sm font-medium">{formatMoney(loan.interest)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Taxa</dt>
            <dd className="tabular text-sm font-medium">
              {loan.monthlyRate === null ? "—" : formatMonthlyRate(loan.monthlyRate)}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
