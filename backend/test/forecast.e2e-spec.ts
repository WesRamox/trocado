import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Previsão: recorrências entram nos cálculos antes de o dia chegar
describe('Previsão de recorrências (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let userId: number;
  let cardId: number;
  let streamingId: number;

  const http = () => ({
    get: (path: string) => request(app.getHttpServer()).get(path).auth(token, { type: 'bearer' }),
    post: (path: string) => request(app.getHttpServer()).post(path).auth(token, { type: 'bearer' }),
    put: (path: string) => request(app.getHttpServer()).put(path).auth(token, { type: 'bearer' }),
    patch: (path: string) => request(app.getHttpServer()).patch(path).auth(token, { type: 'bearer' }),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const email = `previsao-${Date.now()}@teste.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Teste', email, password: 'senha1234' })
      .expect(201);
    userId = registered.body.id;
    token = (await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'senha1234' })).body
      .access_token;

    // Fecha dia 3, vence dia 10
    cardId = (
      await http()
        .post('/cards')
        .send({ name: 'Nubank', type: 'CREDIT', lastFourDigits: '1234', closingDay: 3, dueDay: 10, creditLimit: 1000 })
        .expect(201)
    ).body.id;

    // Tudo em 2030: nenhuma ocorrência foi gerada ainda, então tudo é previsão
    await http()
      .post('/recurrences')
      .send({ name: 'Salário', amount: 5000, type: 'INFLOW', frequency: 'MONTHLY', startDate: '2030-01-05' })
      .expect(201);
    streamingId = (
      await http()
        .post('/recurrences')
        .send({ name: 'Streaming', amount: 40, type: 'OUTFLOW', frequency: 'MONTHLY', startDate: '2030-01-15', cardId })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it('lista as recorrências previstas do mês, sem criar lançamentos', async () => {
    const { body } = await http().get('/transactions/forecast?month=2030-03').expect(200);

    expect(body).toEqual([
      expect.objectContaining({ id: null, projected: true, name: 'Salário', amount: 5000, date: '2030-03-05' }),
      expect.objectContaining({
        id: null,
        projected: true,
        name: 'Streaming',
        amount: 40,
        date: '2030-03-15',
        invoiceDueDate: '2030-04-10',
      }),
    ]);
    expect((await http().get('/transactions?month=2030-03').expect(200)).body).toEqual([]);
  });

  it('o resumo do mês já conta o previsto', async () => {
    const { body } = await http().get('/transactions/summary?month=2030-03').expect(200);
    expect(body).toEqual({
      month: '2030-03',
      inflow: 5000,
      outflow: 40,
      balance: 4960,
      projectedInflow: 5000,
      projectedOutflow: 40,
    });
  });

  it('a recorrência no cartão aparece na fatura certa, mas não ocupa o limite', async () => {
    const { body } = await http().get(`/cards/${cardId}/invoices/2030-04`).expect(200);

    expect(body).toMatchObject({ total: 40, projectedTotal: 40, remaining: 40, transactions: [] });
    expect(body.projected).toEqual([expect.objectContaining({ name: 'Streaming', date: '2030-03-15' })]);
    expect((await http().get(`/cards/${cardId}/limit`).expect(200)).body.used).toBe(0);
  });

  it('com o total da fatura informado, a previsão não é somada de novo', async () => {
    const { body } = await http().put(`/cards/${cardId}/invoices/2030-05/total`).send({ total: 100 }).expect(200);
    expect(body).toMatchObject({ total: 100, projectedTotal: 0, projected: [] });
  });

  it('encerrar a recorrência tira os meses seguintes da previsão', async () => {
    await http().patch(`/recurrences/${streamingId}`).send({ endDate: '2030-02-28' }).expect(200);

    const { body } = await http().get('/transactions/forecast?month=2030-03&type=OUTFLOW').expect(200);
    expect(body).toEqual([]);
  });

  describe('aviso de lançamento repetido', () => {
    const matches = async (query: string) =>
      (await http().get(`/transactions/recurrence-matches?${query}`).expect(200)).body;

    it('acha a recorrência prevista com o mesmo tipo e valor, perto da data', async () => {
      expect(await matches('date=2030-03-07&amount=5000&type=INFLOW')).toEqual([
        { recurrenceId: expect.any(Number), name: 'Salário', date: '2030-03-05', amount: 5000, projected: true },
      ]);
    });

    it('não avisa com outro valor, outro tipo ou longe da data', async () => {
      expect(await matches('date=2030-03-07&amount=4999.99&type=INFLOW')).toEqual([]);
      expect(await matches('date=2030-03-07&amount=5000&type=OUTFLOW')).toEqual([]);
      expect(await matches('date=2030-03-15&amount=5000&type=INFLOW')).toEqual([]);
    });

    it('acha também a ocorrência que a recorrência já lançou', async () => {
      // Começa no passado: as ocorrências já viraram lançamentos
      await http()
        .post('/recurrences')
        .send({ name: 'Academia', amount: 100, type: 'OUTFLOW', frequency: 'MONTHLY', startDate: '2020-01-10' })
        .expect(201);

      expect(await matches('date=2020-02-12&amount=100&type=OUTFLOW')).toEqual([
        { recurrenceId: expect.any(Number), name: 'Academia', date: '2020-02-10', amount: 100, projected: false },
      ]);
    });
  });
});
