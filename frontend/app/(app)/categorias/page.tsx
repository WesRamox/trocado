import { Plus, Tags } from "lucide-react";
import type { Metadata } from "next";
import { CategoryActions } from "@/components/categories/category-actions";
import { CategoryDialog } from "@/components/categories/category-dialog";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { callBackend } from "@/lib/call-backend";
import { formatMoney } from "@/lib/format";
import type { Category, TransactionType } from "@/lib/types";

export const metadata: Metadata = { title: "Categorias" };

const GROUPS: { type: TransactionType; title: string; empty: string }[] = [
  { type: "OUTFLOW", title: "Saídas", empty: "Ex.: Mercado, Moradia, Transporte" },
  { type: "INFLOW", title: "Entradas", empty: "Ex.: Salário, Freelas, Rendimentos" },
];

export default async function CategoriesPage() {
  const categories = await callBackend<Category[]>("/categories");

  return (
    <>
      <PageHeader
        title="Categorias"
        icon={Tags}
        tone="gold"
        description="Separe para onde vai e de onde vem o dinheiro."
      />
      <div className="grid gap-8 md:grid-cols-2">
        {GROUPS.map(({ type, title, empty }) => {
          const group = categories.filter((category) => category.type === type);
          return (
            <section key={type}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">{title}</h2>
                <CategoryDialog
                  type={type}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Plus /> Nova
                    </Button>
                  }
                />
              </div>
              {group.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma categoria de {title.toLowerCase()}. {empty}.
                </p>
              ) : (
                <ul className="divide-y rounded-xl border bg-card">
                  {group.map((category) => (
                    <li key={category.id} className="flex items-center gap-3 px-4 py-2.5">
                      <CategoryIcon category={category} size="sm" />
                      <span className="flex-1 truncate text-sm">{category.name}</span>
                      {category.monthlyBudget !== null && (
                        <span className="tabular text-xs text-muted-foreground">
                          {formatMoney(category.monthlyBudget)}/mês
                        </span>
                      )}
                      <CategoryActions category={category} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
