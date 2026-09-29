import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Compras que outras pessoas fizeram nos seus cartões
describe('Emprestados (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let userId: number;
  let cardId: number;
  let personId: number;
  let installmentIds: number[];

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

    const email = `emprestados-${Date.now()}@teste.com`;
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
    personId = (await http().post('/people').send({ name: 'Mãe', color: '#aa3366' }).expect(201)).body.id;

    // 3x de 100 da mãe: faturas de maio, junho e julho de 2030
    const created = await http()
      .post('/transactions')
      .send({ name: 'Tênis', amount: 300, type: 'OUTFLOW', date: '2030-04-20', cardId, installments: 3, personId })
      .expect(201);
    installmentIds = created.body.map((t: { id: number }) => t.id);
    // Uma compra sua na mesma fatura
    await http()
      .post('/transactions')
      .send({ name: 'Mercado', amount: 50, type: 'OUTFLOW', date: '2030-04-22', cardId })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  const borrowed = async (month: string) => (await http().get(`/borrowed?month=${month}`).expect(200)).body;

  it('não é gasto seu, mas continua na fatura e no limite', async () => {
    expect((await http().get('/transactions/summary?month=2030-04').expect(200)).body.outflow).toBe(50);
    expect((await http().get(`/cards/${cardId}/invoices/2030-05`).expect(200)).body.total).toBe(150);
    expect((await http().get(`/cards/${cardId}/limit`).expect(200)).body.used).toBe(350);
  });

  it('cobra a parcela pelo mês da fatura e mostra o total em aberto', async () => {
    const body = await borrowed('2030-05');

    expect(body).toMatchObject({ total: 100, pending: 100, received: 0, open: 300 });
    expect(body.people).toEqual([
      expect.objectContaining({
        person: expect.objectContaining({ id: personId, name: 'Mãe' }),
        total: 100,
        pending: 100,
        receivedAt: null,
        items: [expect.objectContaining({ name: 'Tênis', installmentNumber: 1, invoiceDueDate: '2030-05-10' })],
      }),
    ]);
  });

  it('marcar como recebido quita o mês; os próximos continuam em aberto', async () => {
    const { body } = await http()
      .put(`/borrowed/${personId}/2030-05/received`)
      .send({ date: '2030-05-10' })
      .expect(200);

    expect(body.people[0]).toMatchObject({ pending: 0, received: 100, receivedAt: '2030-05-10', open: 200 });
    expect((await borrowed('2030-06')).people[0]).toMatchObject({ pending: 100, open: 200 });
  });

  it('desfazer volta a cobrar o mês', async () => {
    const { body } = await http().delete(`/borrowed/${personId}/2030-05/received`).expect(200);
    expect(body.people[0]).toMatchObject({ pending: 100, receivedAt: null, open: 300 });
  });

  it('trocar de quem é uma parcela vale para a compra toda', async () => {
    const { body } = await http().patch(`/transactions/${installmentIds[1]}`).send({ personId: null }).expect(200);
    expect(body.personId).toBeNull();

    expect((await borrowed('2030-05')).open).toBe(0);
    expect((await http().get('/transactions/summary?month=2030-04').expect(200)).body.outflow).toBe(150);

    await http().patch(`/transactions/${installmentIds[0]}`).send({ personId }).expect(200);
    expect((await borrowed('2030-05')).open).toBe(300);
  });

  it('vincular uma compra antiga dá como recebidas as parcelas de faturas já vencidas', async () => {
    // 2x de 40 em 2020: as duas faturas já venceram
    const created = await http()
      .post('/transactions')
      .send({ name: 'Fone', amount: 80, type: 'OUTFLOW', date: '2020-01-20', cardId, installments: 2 })
      .expect(201);
    await http().patch(`/transactions/${created.body[1].id}`).send({ personId }).expect(200);

    const { body } = await http().get(`/transactions/${created.body[0].id}`).expect(200);
    expect(body).toMatchObject({ personId, reimbursedAt: '2020-02-10' });
    expect((await borrowed('2020-02')).people[0]).toMatchObject({ total: 40, pending: 0, receivedAt: '2020-02-10' });
    // O que ainda está em aberto continua sendo só a compra de 2030
    expect((await borrowed('2030-05')).open).toBe(300);
  });

  it('não aceita pessoa de outro usuário', async () => {
    await http().patch(`/transactions/${installmentIds[0]}`).send({ personId: 999999999 }).expect(404);
  });

  it('excluir a pessoa devolve as compras para você', async () => {
    await http().delete(`/people/${personId}`).expect(204);

    expect((await borrowed('2030-05')).people).toEqual([]);
    const { body } = await http().get(`/transactions/${installmentIds[0]}`).expect(200);
    expect(body).toMatchObject({ personId: null, reimbursedAt: null });
  });
});
