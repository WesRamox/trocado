<p align="center">
  <img src="frontend/app/icon.svg" width="72" alt="Marca do Trocado: moeda dourada com seta verde" />
</p>

<h1 align="center">Trocado</h1>

<p align="center">Cuide de cada trocado do seu mês.</p>

O Trocado é um app de controle financeiro pessoal. Você registra despesas e entradas, acompanha as faturas dos cartões e vê para onde foi o dinheiro de cada mês, sem planilhas.

## Funcionalidades

- **Lançamentos:** despesas e entradas com categoria, cartão e observação, inclusive compras parceladas (cada parcela cai no mês e na fatura certos).
- **Recorrências:** aluguel, assinaturas e salário são cadastrados uma vez e viram lançamentos sozinhos na data. Dá para editar, encerrar ou excluir sem mexer no histórico. As próximas ocorrências já entram como **previstas** no saldo, nos indicadores, nos orçamentos e nas faturas dos meses seguintes, sem esperar o dia chegar (o limite do cartão só conta o que já passou).
- **Cartões e faturas:** cada compra no crédito entra na fatura certa, calculada pelos dias de fechamento e vencimento do cartão. Quem não quer lançar cada compra pode informar só o total da fatura: o que já está lançado nela é descontado e a diferença entra como "sem detalhe". Faturas podem ser pagas no todo ou em parte; o limite em uso considera tudo que ainda não foi pago, inclusive as parcelas das próximas faturas, e é liberado conforme os pagamentos.
- **Emprestados:** compras que outras pessoas (pai, mãe, namorada...) fizeram nos seus cartões. Elas continuam na fatura e no limite, mas saem dos seus gastos. A tela mostra quanto cada pessoa te deve no mês, pelo vencimento das faturas, e quanto ainda está em aberto contando as próximas parcelas; quando ela paga, é só marcar como recebido. Uma compra também pode ser dividida (ex.: metade sua, metade da namorada): a parte da pessoa vira um lançamento dela em todas as parcelas, e a divisão pode ser desfeita.
- **Categorias** de entrada e de saída, com cores.
- **Orçamentos:** um limite mensal opcional por categoria de saída. A visão geral mostra quanto de cada um já foi usado, com alerta a partir de 80% e aviso quando estoura.
- **Visão geral do mês:**
  - saldo, taxa de poupança, gastos em relação ao mês anterior, média diária com projeção, e quanto das entradas já está comprometido com gastos fixos;
  - pizzas de gastos por categoria e por forma de pagamento;
  - entradas e saídas dos últimos 6 meses e os maiores gastos do mês.
- **Tema claro e escuro**, que segue o sistema até você escolher.

## Tecnologias

| Parte | Stack |
|---|---|
| API (`backend/`) | NestJS 12, Prisma 7, PostgreSQL 16, JWT, class-validator, Vitest |
| Web (`frontend/`) | Next.js 16 (App Router, Route Handlers), React 19, Tailwind CSS 4, shadcn/ui (Radix), next-themes |

## Estrutura

```
.
├── backend/                  API NestJS
│   ├── prisma/               schema e migrations
│   ├── src/
│   │   ├── auth/             cadastro, login e guard JWT (rotas protegidas por padrão)
│   │   ├── cards/            cartões e cálculo de fatura
│   │   ├── categories/
│   │   ├── people/           pessoas que usam seus cartões e o que cada uma deve (emprestados)
│   │   ├── transactions/     lançamentos, parcelas, resumo, histórico e faturas
│   │   ├── recurrences/      regras de recorrência e geração dos lançamentos
│   │   └── common/           dinheiro, datas e validações compartilhadas
│   └── docker-compose.yml    PostgreSQL para desenvolvimento
├── frontend/                 app Next.js
│   ├── app/(auth)/           entrar e criar conta
│   ├── app/(app)/            visão geral, lançamentos, recorrências, cartões, categorias
│   ├── app/api/              proxy das chamadas do navegador para a API e login/logout
│   ├── components/
│   ├── lib/                  callBackend (cliente da API), sessão, formatação e indicadores
│   └── proxy.ts              redireciona quem não está logado
├── .github/workflows/ci.yml  CI: lint, tipos, testes e build a cada pull request
└── Trocado Logo Mark.html    manual da marca (logo e paleta)
```

## Como rodar localmente

Você precisa de **Node.js 22** (versão em `.nvmrc`, a mesma do CI) e **Docker** (para o PostgreSQL).

### 1. Banco de dados

```bash
cd backend
docker compose up -d
```

### 2. API

```bash
cd backend
cp .env.example .env          # depois preencha o JWT_SECRET (openssl rand -hex 32)
npm install                   # também gera o Prisma Client
npx prisma migrate deploy --config prisma7.config.ts
npm run start:dev             # http://localhost:3333
```

O arquivo de configuração do Prisma se chama `prisma7.config.ts`, por isso os comandos do Prisma levam `--config`.

### 3. Web

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

Abra http://localhost:3000 e crie uma conta.

> `npm run dev` compila cada página na primeira visita e fica bem mais lento que a versão de produção. Para sentir a velocidade real: `npm run build && npm start`.

## Variáveis de ambiente

**API** (`backend/.env`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | URL de conexão do PostgreSQL |
| `JWT_SECRET` | sim | Segredo que assina os tokens. A API não inicia sem ele |
| `JWT_EXPIRES_IN` | não | Validade do token (padrão `1d`) |
| `PORT` | não | Porta da API (padrão `3333`) |
| `FRONTEND_URL` | não | Origem liberada no CORS (padrão `http://localhost:3000`) |

**Web** (`frontend/.env.local`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `API_URL` | não | Endereço da API (padrão `http://localhost:3333`). Usada só no servidor do Next |

## Como funciona

- **Sessão:** o token JWT fica num cookie `httpOnly` e o JavaScript da página nunca vê o token. Sessão expirada leva de volta ao login.
- **Chamadas à API:** todas passam por uma única função, `callBackend()` (`frontend/lib/call-backend.ts`), nas páginas (servidor) e nos formulários e botões (navegador):

  ```ts
  callBackend<Card[]>("/cards")
  callBackend("/cards", { method: "POST", body: { name: "Nubank" } })
  callBackend(`/transactions/${id}`, { method: "DELETE", query: { allInstallments: true } })
  ```

  No servidor, ela chama a API direto com o token da sessão. No navegador, chama `/api/*`, uma rota do Next que anexa o token do cookie. Quem escolhe o destino é o import `#backend-target` do `package.json`.
- **Dinheiro:** o banco guarda centavos (inteiros). A API recebe e devolve reais com duas casas (`150.75`), sem erros de arredondamento.
- **Datas:** datas de lançamento não têm horário e são trocadas no formato `YYYY-MM-DD`.
- **Edição (`PATCH`):** campo omitido não muda, `null` limpa um campo opcional (como `description` ou `cardId`), e `null` em campo obrigatório é recusado com erro 400.
- **Recorrências:** um job de hora em hora (`RecurrencesScheduler`) cria os lançamentos das ocorrências que já chegaram, no "hoje" do fuso de cada pessoa. Criar ou editar uma recorrência gera na hora o que já venceu. As consultas (GET) só leem. Se o servidor ficar fora do ar, a próxima execução gera o que ficou para trás, e execuções simultâneas não duplicam lançamentos.
- **Fuso horário:** cada pessoa tem um fuso IANA (`timezone`), capturado do navegador no cadastro (padrão `America/Sao_Paulo`). Ele define o "hoje" das recorrências e o mês atual das telas.
- **Faturas:** compras feitas a partir do dia de fechamento entram na fatura seguinte. O vencimento de cada lançamento fica gravado, então mudar o fechamento do cartão não altera faturas antigas.
- **Acesso aos dados:** cada usuário só enxerga e só usa os próprios cartões, categorias e lançamentos.

## API

Todas as rotas exigem `Authorization: Bearer <token>`, exceto cadastro e login. Valores em reais; meses no formato `YYYY-MM`.

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/register` | Cria conta (`name`, `email`, `password`, `timezone` opcional) |
| `POST` | `/auth/login` | Retorna `{ access_token }` |
| `GET` `PATCH` | `/auth/profile` | Usuário logado / altera `name` e `timezone` |
| `GET` `POST` | `/transactions` | Lista por mês (`?month=&type=&cardId=&categoryId=`) / cria (com `installments` para parcelar) |
| `GET` `PATCH` `DELETE` | `/transactions/:id` | Um lançamento. `DELETE ?allInstallments=true` remove todas as parcelas da compra |
| `GET` | `/transactions/summary?month=` | Entradas, saídas e saldo do mês |
| `GET` | `/transactions/summary/history?from=&to=` | Resumo de cada mês do intervalo (até 24 meses) |
| `GET` `POST` | `/recurrences` | Lista / cria |
| `GET` `PATCH` `DELETE` | `/recurrences/:id` | Uma recorrência. Para encerrar, envie `endDate` |
| `GET` `POST` | `/cards` | Lista / cria (crédito exige `closingDay` e `dueDay`) |
| `GET` `PATCH` `DELETE` | `/cards/:id` | Um cartão |
| `GET` | `/cards/:cardId/invoices/:month` | Fatura que vence no mês |
| `PUT` `DELETE` | `/cards/:cardId/invoices/:month/total` | Informa o total da fatura (`total`); a diferença para os itens lançados vira um lançamento "sem detalhe" (`invoiceRemainder`). `DELETE` remove esse valor |
| `GET` `POST` | `/categories` | Lista (`?type=`) / cria (`monthlyBudget` opcional, só em saídas) |
| `GET` `PATCH` `DELETE` | `/categories/:id` | Uma categoria |

## Scripts

| Onde | Comando | O que faz |
|---|---|---|
| `backend/` | `npm run start:dev` | API com recarga automática |
| `backend/` | `npm test` | Testes unitários (Vitest) |
| `backend/` | `npm run test:e2e` | Testes e2e (precisam de `DATABASE_URL` e `JWT_SECRET`) |
| `backend/` | `npm run lint` | Lint (oxlint) |
| `backend/` | `npm run typecheck` | Checagem de tipos |
| `backend/` | `npm run build` / `npm run start:prod` | Build e execução de produção |
| `frontend/` | `npm run dev` | App em modo de desenvolvimento |
| `frontend/` | `npm run lint` | Lint (ESLint) |
| `frontend/` | `npm run typecheck` | Gera os tipos de rotas do Next e checa os tipos |
| `frontend/` | `npm run build` / `npm start` | Build e execução de produção |

O CI (`.github/workflows/ci.yml`) roda lint, tipos, testes unitários e e2e e o build dos dois projetos em cada pull request e em cada push na `main`.
