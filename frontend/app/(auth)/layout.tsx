import { Logo } from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-switch";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-svh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <Logo tone="dark" className="text-lg text-white" />
        <div className="max-w-md">
          <p className="text-4xl leading-tight font-semibold text-white">
            Cuide de cada trocado do seu mês.
          </p>
          <p className="mt-4 text-sidebar-foreground/80">
            Registre despesas e entradas, acompanhe as faturas dos cartões e veja o saldo do mês
            sem planilhas.
          </p>
        </div>
        <StatementLines />
      </section>
      <section className="relative flex items-center justify-center p-6 sm:p-12">
        <ThemeSwitch className="absolute top-4 right-4 sm:top-6 sm:right-6" />
        <div className="w-full max-w-sm">
          <Logo className="mb-10 text-lg lg:hidden" />
          {children}
        </div>
      </section>
    </main>
  );
}

// Linhas de extrato decorativas, com os valores do exemplo
function StatementLines() {
  const lines = [
    { name: "Salário", value: "+ R$ 7.500,00", inflow: true },
    { name: "Mercado", value: "− R$ 412,30", inflow: false },
    { name: "Notebook 2/10", value: "− R$ 329,90", inflow: false },
    { name: "Aluguel", value: "− R$ 1.800,00", inflow: false },
  ];
  return (
    <ul aria-hidden className="tabular max-w-md divide-y divide-sidebar-border text-sm">
      {lines.map((line) => (
        <li key={line.name} className="flex justify-between py-3">
          <span>{line.name}</span>
          <span className={line.inflow ? "text-[#1f9ab8]" : "text-sidebar-foreground"}>
            {line.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
