import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Compra dividida com outra pessoa (ex.: metade sua, metade da namorada)
describe('Dividir compra (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let userId: number;
  let cardId: number;
  let personId: number;
  let installmentIds: number[];
  let partId: number;

  const http = () => ({
    get: (path: string) => request(app.getHttpServer()).get(path).auth(token, { type: 'bearer' }),
    post: (path: string) => request(app.getHttpServer()).post(path).auth(token, { type: 'bearer' }),
    delete: (path: string) => request(app.getHttpServer()).delete(path).auth(token, { type: 'bearer' }),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const email = `dividir-${Date.now()}@teste.com`;
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
    personId = (await http().post('/people').send({ name: 'Amor' }).expect(201)).body.id;

    // 3x de 100: faturas de maio, junho e julho de 2030
    const created = await http()
      .post('/transactions')
      .send({ name: 'Jantar', amount: 300, type: 'OUTFLOW', date: '2030-04-20', cardId, installments: 3 })
      .expect(201);
    installmentIds = created.body.map((t: { id: number }) => t.id);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  const summary = async (month: string) =>
    (await http().get(`/transactions/summary?month=${month}`).expect(200)).body.outflow;

  it('divide todas as parcelas: a parte dela sai dos seus gastos, a fatura não muda', async () => {
    const { body } = await http()
      .post(`/transactions/${installmentIds[1]}/split`)
      .send({ personId, amount: 40 })
      .expect(201);
    partId = body.id;

    expect(body).toMatchObject({
      personId,
      splitOfId: installmentIds[1],
      amount: 40,
      installmentNumber: 2,
      installmentCount: 3,
      invoiceDueDate: '2030-06-10',
    });
    expect((await http().get(`/transactions/${installmentIds[0]}`).expect(200)).body.amount).toBe(60);
    expect(await summary('2030-04')).toBe(60);
    expect((await http().get(`/cards/${cardId}/invoices/2030-05`).expect(200)).body.total).toBe(100);
    expect((await http().get(`/cards/${cardId}/limit`).expect(200)).body.used).toBe(300);
  });

  it('a parte dela aparece em emprestados em cada mês', async () => {
    const { body } = await http().get('/borrowed?month=2030-07').expect(200);
    expect(body.people[0]).toMatchObject({ total: 40, pending: 40, open: 120 });
  });

  it('não aceita a parte maior ou igual à parcela, nem dividir a parte de alguém', async () => {
    await http().post(`/transactions/${installmentIds[0]}/split`).send({ personId, amount: 60 }).expect(400);
    await http().post(`/transactions/${partId}/split`).send({ personId, amount: 10 }).expect(400);
  });

  it('desfazer devolve o valor para as parcelas originais', async () => {
    const { body } = await http().delete(`/transactions/${partId}/split`).expect(200);

    expect(body).toMatchObject({ id: installmentIds[1], amount: 100 });
    expect(await summary('2030-04')).toBe(100);
    expect((await http().get('/borrowed?month=2030-07').expect(200)).body.open).toBe(0);
  });

  it('excluir a compra original leva junto a parte da pessoa', async () => {
    const part = (
      await http().post(`/transactions/${installmentIds[0]}/split`).send({ personId, amount: 50 }).expect(201)
    ).body;
    await http().delete(`/transactions/${installmentIds[0]}?allInstallments=true`).expect(204);

    await http().get(`/transactions/${part.id}`).expect(404);
  });
});
