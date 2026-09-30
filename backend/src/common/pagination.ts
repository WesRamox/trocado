// Paginação por página (1, 2, 3...) para listas que podem crescer muito
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  // Quantos itens existem ao todo, somando todas as páginas
  totalItems: number;
  totalPages: number;
}

// skip/take do Prisma para a página pedida
export const pageWindow = (page: number, pageSize: number) => ({ skip: (page - 1) * pageSize, take: pageSize });

export const toPage = <T>(items: T[], page: number, pageSize: number, totalItems: number): Page<T> => ({
  items,
  page,
  pageSize,
  totalItems,
  totalPages: Math.max(Math.ceil(totalItems / pageSize), 1),
});
