import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Pagamento de fatura e limite em uso do cartão
describe('Pagamento de fatura (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let userId: number;
  let cardId: number;

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

    const email = `pagamentos-${Date.now()}@teste.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Teste', email, password: 'senha1234' })
      .expect(201);
    userId = registered.body.id;
    token = (await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'senha1234' })).body
      .access_token;

    // Fecha dia 3, vence dia 10, limite de 1.000
    const card = await http()
      .post('/cards')
      .send({ name: 'Nubank', type: 'CREDIT', lastFourDigits: '1234', closingDay: 3, dueDay: 10, creditLimit: 1000 })
      .expect(201);
    cardId = card.body.id;
    // 3x de 200: faturas de maio, junho e julho de 2030
    await http()
      .post('/transactions')
      .send({ name: 'Geladeira', amount: 600, type: 'OUTFLOW', date: '2030-04-20', cardId, installments: 3 })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  const invoicePath = () => `/cards/${cardId}/invoices/2030-05`;

  it('a compra parcelada ocupa o limite pelo valor total, não só pela parcela do mês', async () => {
    const { body } = await http().get(`/cards/${cardId}/limit`).expect(200);
    expect(body).toEqual({ cardId, limit: 1000, used: 600, available: 400 });
  });

  it('pagamento parcial abate o que falta e libera o limite', async () => {
    const { body } = await http()
      .post(`${invoicePath()}/payments`)
      .send({ amount: 150, date: '2030-05-08' })
      .expect(201);

    expect(body).toMatchObject({ total: 200, paid: 150, remaining: 50 });
    expect(body.payments).toEqual([expect.objectContaining({ amount: 150, date: '2030-05-08' })]);
    expect((await http().get(`/cards/${cardId}/limit`).expect(200)).body.available).toBe(550);
  });

  it('não aceita pagar mais do que falta', async () => {
    const { body } = await http()
      .post(`${invoicePath()}/payments`)
      .send({ amount: 60, date: '2030-05-09' })
      .expect(400);
    expect(body.message).toMatch(/50,00/);
  });

  it('quitada, a fatura não aceita outro pagamento', async () => {
    const { body } = await http()
      .post(`${invoicePath()}/payments`)
      .send({ amount: 50, date: '2030-05-09' })
      .expect(201);
    expect(body.remaining).toBe(0);

    await http().post(`${invoicePath()}/payments`).send({ amount: 1, date: '2030-05-09' }).expect(400);
  });

  it('pagar não é um gasto: os gastos do mês continuam iguais', async () => {
    const { body } = await http().get('/transactions/summary?month=2030-05').expect(200);
    expect(body.outflow).toBe(200);
  });

  it('excluir um pagamento volta o valor para a fatura e para o limite', async () => {
    const invoice = (await http().get(invoicePath()).expect(200)).body;
    await http().delete(`${invoicePath()}/payments/${invoice.payments[0].id}`).expect(204);

    const { body } = await http().get(invoicePath()).expect(200);
    expect(body).toMatchObject({ paid: 50, remaining: 150 });
    expect((await http().get(`/cards/${cardId}/limit`).expect(200)).body.used).toBe(550);
  });

  it('pagamento de outra fatura ou inexistente dá 404', async () => {
    const invoice = (await http().get(invoicePath()).expect(200)).body;
    await http().delete(`/cards/${cardId}/invoices/2030-06/payments/${invoice.payments[0].id}`).expect(404);
    await http().delete(`${invoicePath()}/payments/999999999`).expect(404);
  });
});
