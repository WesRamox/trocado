# Trocado

Controle de finanças pessoais: cartões de crédito e débito, faturas, lançamentos parcelados, recorrências e categorias, com um painel mensal de gastos.

| Pasta       | Stack                                                  | Porta |
| ----------- | ------------------------------------------------------ | ----- |
| `backend/`  | NestJS 12, Prisma 7, PostgreSQL, JWT                   | 3333  |
| `frontend/` | Next.js 16 (App Router), React 19, Tailwind 4, shadcn  | 3000  |

## Rodando localmente

Requisitos: Node 22 (veja `.nvmrc`) e Docker (ou um PostgreSQL 16 próprio).

### 1. Banco e API

```bash
cd backend
docker compose up -d          # PostgreSQL em localhost:5432
cp .env.example .env          # ajuste JWT_SECRET
npm install                   # também gera o Prisma Client (postinstall)
npx prisma migrate deploy     # cria as tabelas
npm run start:dev             # http://localhost:3333
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local    # API_URL=http://localhost:3333
npm install
npm run dev                   # http://localhost:3000
```

Crie uma conta em `/cadastro` e pronto.

## Scripts

| Onde       | Comando              | O que faz                                        |
| ---------- | -------------------- | ------------------------------------------------ |
| `backend`  | `npm test`           | Testes unitários (Vitest)                        |
| `backend`  | `npm run test:e2e`   | Testes e2e (precisam de `DATABASE_URL` e `JWT_SECRET`) |
| `backend`  | `npm run lint`       | oxlint                                           |
| `backend`  | `npm run typecheck`  | Checagem de tipos                                |
| `frontend` | `npm run lint`       | ESLint                                           |
| `frontend` | `npm run typecheck`  | Gera os tipos de rotas do Next e checa os tipos  |
| `frontend` | `npm run build`      | Build de produção                                |

O CI (`.github/workflows/ci.yml`) roda tudo isso em cada push e pull request.

## Arquitetura

- **Valores e datas.** A API guarda dinheiro em centavos (`Int`) e expõe em reais. Datas sem horário são tratadas como meia-noite UTC.
- **Faturas.** Compras a partir do dia de fechamento entram na fatura seguinte (`backend/src/cards/invoice.ts`). Cada parcela cai numa fatura.
- **Recorrências.** Os lançamentos de uma recorrência são gerados quando alguém consulta lançamentos, histórico ou fatura, até a data de hoje.
- **Requisições do frontend.** Todas passam por `callBackend()` (`frontend/lib/call-backend.ts`):

  ```ts
  callBackend<Card[]>("/cards")
  callBackend("/cards", { method: "POST", body: { name: "Nubank" } })
  ```

  No servidor, ela chama a API direto com o token da sessão. No navegador, chama `/api/*`, uma rota do Next que anexa o token guardado em cookie httpOnly: o JavaScript da página nunca vê o token.
