import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pageNumbers } from "@/lib/pagination";
import { cn } from "@/lib/utils";

// Navegação entre páginas via ?pagina=N (ou outro `pageParam`), preservando os outros filtros da URL (mês, tipo...)
export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  basePath,
  params = {},
  pageParam = "pagina",
  itemLabel = ["item", "itens"],
  className,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  basePath: string;
  params?: Record<string, string | undefined>;
  // Nome do parâmetro da página na URL, para ter mais de uma lista paginada na mesma tela
  pageParam?: string;
  // Singular e plural, para "21–40 de 42 lançamentos"
  itemLabel?: [string, string];
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const search = new URLSearchParams(clean(params));
    // A primeira página fica sem o parâmetro, com a mesma URL de antes da paginação
    if (target > 1) search.set(pageParam, String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);

  return (
    <nav
      aria-label="Paginação"
      className={cn("mt-6 flex flex-wrap items-center justify-between gap-3 text-sm", className)}
    >
      <p className="tabular text-muted-foreground">
        {first}–{last} de {totalItems} {totalItems === 1 ? itemLabel[0] : itemLabel[1]}
      </p>
      <div className="flex items-center gap-1">
        <StepLink href={page > 1 ? hrefFor(page - 1) : undefined} label="Página anterior">
          <ChevronLeft />
        </StepLink>
        {pageNumbers(page, totalPages).map((n, i) =>
          n === "gap" ? (
            <span key={`gap-${i}`} aria-hidden className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <Button key={n} variant={n === page ? "secondary" : "ghost"} size="icon" asChild>
              <Link
                href={hrefFor(n)}
                aria-label={`Página ${n}`}
                aria-current={n === page ? "page" : undefined}
                className="tabular"
              >
                {n}
              </Link>
            </Button>
          ),
        )}
        <StepLink href={page < totalPages ? hrefFor(page + 1) : undefined} label="Próxima página">
          <ChevronRight />
        </StepLink>
      </div>
    </nav>
  );
}

// Anterior/próxima: vira botão desabilitado nas pontas
function StepLink({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) {
  if (!href) {
    return (
      <Button variant="outline" size="icon" disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button variant="outline" size="icon" asChild>
      <Link href={href} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}

const clean = (params: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(params).filter((entry): entry is [string, string] => !!entry[1]));
