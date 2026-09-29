import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Fluxo de caixa: o cartão entra pela fatura que vence no mês, e o reembolso de quem usou o cartão é entrada
describe('Fluxo de caixa (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let userId: number;
  let cardId: number;

  const http = () => ({
    get: (path: string) => request(app.getHttpServer()).get(path).auth(token, { type: 'bearer' }),
    post: (path: string) => request(app.getHttpServer()).post(path).auth(token, { type: 'bearer' }),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const email = `caixa-${Date.now()}@teste.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Teste', email, password: 'senha1234' })
      .expect(201);
    userId = registered.body.id;
    token = (await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'senha1234' })).body
      .access_token;

    // Fecha dia 3, vence dia 10: a fatura de 10/05/2030 recebe compras de 03/04 a 02/05
    cardId = (
      await http()
        .post('/cards')
        .send({ name: 'Nubank', type: 'CREDIT', lastFourDigits: '1234', closingDay: 3, dueDay: 10 })
        .expect(201)
    ).body.id;
    const personId = (await http().post('/people').send({ name: 'Mãe' }).expect(201)).body.id;

    const create = (body: object) => http().post('/transactions').send(body).expect(201);
    await create({ name: 'Salário', amount: 5000, type: 'INFLOW', date: '2030-05-05' });
    await create({ name: 'Aluguel', amount: 1500, type: 'OUTFLOW', date: '2030-05-10' });
    // Na fatura de maio
    await create({ name: 'Mercado', amount: 300, type: 'OUTFLOW', date: '2030-04-20', cardId });
    await create({ name: 'Remédio da mãe', amount: 100, type: 'OUTFLOW', date: '2030-04-22', cardId, personId });
    // Na fatura de junho
    await create({ name: 'Tênis', amount: 200, type: 'OUTFLOW', date: '2030-05-15', cardId });
    // Recorrência no cartão: a de 15/04 cai na fatura de maio (prevista)
    await http()
      .post('/recurrences')
      .send({ name: 'Streaming', amount: 40, type: 'OUTFLOW', frequency: 'MONTHLY', startDate: '2030-04-15', cardId })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it('conta a fatura que vence no mês e o reembolso como entrada', async () => {
    const { body } = await http().get('/transactions/cashflow?month=2030-05').expect(200);

    expect(body).toEqual({
      month: '2030-05',
      // Salário + reembolso da mãe
      inflow: 5100,
      // Fatura de maio (300 + 100 da mãe + 40 previstos) + aluguel
      outflow: 1940,
      balance: 3160,
      projectedInflow: 0,
      projectedOutflow: 40,
      income: 5000,
      reimbursements: 100,
      invoices: [{ cardId, name: 'Nubank', dueDate: '2030-05-10', total: 440 }],
      invoicesTotal: 440,
      otherOutflow: 1500,
    });
  });

  it('o resumo pela data da compra continua como antes', async () => {
    const { body } = await http().get('/transactions/summary?month=2030-05').expect(200);
    // Aluguel + tênis + streaming de 15/05 (previsto); a compra da mãe não é gasto seu
    expect(body).toMatchObject({ inflow: 5000, outflow: 1740 });
  });
});
