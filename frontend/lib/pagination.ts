// Página vinda do backend (GET /transactions?page=...)
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// ?pagina=3 -> 3; qualquer outra coisa -> 1
export function parsePage(value: string | string[] | undefined) {
  const page = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : 1;
  return Math.max(page, 1);
}

// Pagina uma lista que já está inteira em memória (ex.: a fatura, que precisa de tudo para o total).
// Uma página além do fim cai na última.
export function paginate<T>(items: T[], requestedPage: number, pageSize: number): Page<T> {
  const totalPages = Math.max(Math.ceil(items.length / pageSize), 1);
  const page = Math.min(requestedPage, totalPages);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages,
  };
}

// Números das páginas a mostrar: a primeira, a última e as vizinhas da atual; "gap" onde pula
export function pageNumbers(page: number, totalPages: number): (number | "gap")[] {
  const shown = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
  return shown.flatMap((n, i) => {
    const previous = shown[i - 1];
    if (previous === undefined || n === previous + 1) return [n];
    // Pular uma página só não vale reticências: mostra o número
    return n === previous + 2 ? [previous + 1, n] : ["gap" as const, n];
  });
}
