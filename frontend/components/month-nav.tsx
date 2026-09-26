import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { monthLabel, shiftMonth } from "@/lib/format";

// Navegação entre meses via ?mes=YYYY-MM, preservando os outros filtros da URL
export function MonthNav({
  month,
  basePath,
  params = {},
}: {
  month: string;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  const hrefFor = (target: string) => {
    const search = new URLSearchParams({ ...clean(params), mes: target });
    return `${basePath}?${search}`;
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" asChild>
        <Link href={hrefFor(shiftMonth(month, -1))} aria-label="Mês anterior">
          <ChevronLeft />
        </Link>
      </Button>
      <span className="min-w-40 text-center text-sm font-medium">{monthLabel(month)}</span>
      <Button variant="outline" size="icon" asChild>
        <Link href={hrefFor(shiftMonth(month, 1))} aria-label="Próximo mês">
          <ChevronRight />
        </Link>
      </Button>
    </div>
  );
}

const clean = (params: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(params).filter((entry): entry is [string, string] => !!entry[1]));
