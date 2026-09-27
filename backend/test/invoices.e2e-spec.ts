import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Fatura informada só pelo total (sem os itens)
describe('Total da fatura (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let userId: number;
  let cardId: number;

  const http = () => ({
    get: (path: string) => request(app.getHttpServer()).get(path).auth(token, { type: 'bearer' }),
    post: (path: string) => request(app.getHttpServer()).post(path).auth(token, { type: 'bearer' }),
    put: (path: string) => request(app.getHttpServer()).put(path).auth(token, { type: 'bearer' }),
    patch: (path: string) => request(app.getHttpServer()).patch(path).auth(token, { type: 'bearer' }),
    delete: (path: string) => request(app.getHttpServer()).delete(path).auth(token, { type: 'bearer' }),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const email = `faturas-${Date.now()}@teste.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Teste', email, password: 'senha1234' })
      .expect(201);
    userId = registered.body.id;
    token = (await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'senha1234' })).body
      .access_token;

    // Fecha dia 3, vence dia 10: a fatura de 10/05/2030 recebe compras de 03/04 a 02/05
    const card = await http()
      .post('/cards')
      .send({ name: 'Nubank', type: 'CREDIT', lastFourDigits: '1234', closingDay: 3, dueDay: 10 })
      .expect(201);
    cardId = card.body.id;
    await http()
      .post('/transactions')
      .send({ name: 'Mercado', amount: 300, type: 'OUTFLOW', date: '2030-04-20', cardId })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  const invoicePath = () => `/cards/${cardId}/invoices/2030-05`;
  const remainderOf = (invoice: { transactions: { id: number; invoiceRemainder: boolean; amount: number; date: string }[] }) =>
    invoice.transactions.filter((t) => t.invoiceRemainder);

  it('a diferença para os itens lançados vira um valor "sem detalhe" na fatura certa', async () => {
    const { body } = await http().put(`${invoicePath()}/total`).send({ total: 1000 }).expect(200);

    expect(body.total).toBe(1000);
    expect(remainderOf(body)).toEqual([
      expect.objectContaining({ amount: 700, date: '2030-05-02', invoiceDueDate: '2030-05-10' }),
    ]);
  });

  it('informar de novo recalcula, sem criar outro', async () => {
    const { body } = await http().put(`${invoicePath()}/total`).send({ total: 1200.5 }).expect(200);

    expect(body.total).toBe(1200.5);
    expect(remainderOf(body)).toHaveLength(1);
    expect(remainderOf(body)[0].amount).toBe(900.5);
  });

  it('entra nos gastos do mês da data do lançamento', async () => {
    const { body } = await http().get('/transactions/summary?month=2030-05').expect(200);
    expect(body.outflow).toBe(900.5);
  });

  it('recusa total menor que os itens já lançados', async () => {
    const { body } = await http().put(`${invoicePath()}/total`).send({ total: 250 }).expect(400);
    expect(body.message).toContain('300,00');
  });

  it('não deixa editar o valor "sem detalhe" como um lançamento comum', async () => {
    const invoice = (await http().get(invoicePath())).body;
    await http().patch(`/transactions/${remainderOf(invoice)[0].id}`).send({ amount: 1 }).expect(400);
  });

  it('total igual aos itens remove o valor "sem detalhe"', async () => {
    const { body } = await http().put(`${invoicePath()}/total`).send({ total: 300 }).expect(200);
    expect(body.total).toBe(300);
    expect(remainderOf(body)).toHaveLength(0);
  });

  it('DELETE remove só o valor "sem detalhe"', async () => {
    await http().put(`${invoicePath()}/total`).send({ total: 800 }).expect(200);
    await http().delete(`${invoicePath()}/total`).expect(204);

    const { body } = await http().get(invoicePath()).expect(200);
    expect(body.total).toBe(300);
    expect(body.transactions).toHaveLength(1);
  });

  it('recusa cartão de débito e mês sem fatura', async () => {
    const debit = await http().post('/cards').send({ name: 'Débito', type: 'DEBIT', lastFourDigits: '9999' });
    await http().put(`/cards/${debit.body.id}/invoices/2030-05/total`).send({ total: 10 }).expect(400);

    // Fecha 28 e vence 29: em fevereiro os dois viram 28/02, então não há fatura
    const card = await http()
      .post('/cards')
      .send({ name: 'Fim do mês', type: 'CREDIT', lastFourDigits: '4321', closingDay: 28, dueDay: 29 });
    const { body } = await http().put(`/cards/${card.body.id}/invoices/2030-02/total`).send({ total: 10 }).expect(400);
    expect(body.message).toContain('não tem fatura');
  });
});
