# Trocado — API

API NestJS do Trocado. Instalação, variáveis de ambiente e rotas estão no [README principal](../README.md).

```bash
docker compose up -d                                   # PostgreSQL
cp .env.example .env                                   # preencha o JWT_SECRET
npm install                                            # também gera o Prisma Client
npx prisma migrate deploy --config prisma7.config.ts
npm run start:dev                                      # http://localhost:3333
npm test                                               # testes
```
