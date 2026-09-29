import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Empréstimos bancários
describe('Empréstimos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let userId: number;
  let loanId: number;

  const http = () => ({
    get: (path: string) => request(app.getHttpServer()).get(path).auth(token, { type: 'bearer' }),
    post: (path: string) => request(app.getHttpServer()).post(path).auth(token, { type: 'bearer' }),
    patch: (path: string) => request(app.getHttpServer()).patch(path).auth(token, { type: 'bearer' }),
    delete: (path: string) => request(app.getHttpServer()).delete(path).auth(token, { type: 'bearer' }),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const email = `emprestimos-${Date.now()}@teste.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Teste', email, password: 'senha1234' })
      .expect(201);
    userId = registered.body.id;
    token = (await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'senha1234' })).body
      .access_token;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it('cria o empréstimo e as parcelas como lançamentos mensais', async () => {
    // Recebeu 10.000, paga 12x de 1.000 a partir de 10/01/2030
    const { body } = await http()
      .post('/loans')
      .send({ name: 'Empréstimo Banco', total: 12000, installments: 12, firstDueDate: '2030-01-10', received: 10000 })
      .expect(201);
    loanId = body.id;

    expect(body).toMatchObject({
      name: 'Empréstimo Banco',
      total: 12000,
      installments: 12,
      installmentAmount: 1000,
      firstDueDate: '2030-01-10',
      lastDueDate: '2030-12-10',
      interest: 2000,
      paidCount: 0,
      remaining: 12000,
      nextDueDate: '2030-01-10',
    });
    expect(body.monthlyRate).toBeCloseTo(0.0292, 3);

    const { body: march } = await http().get('/transactions?month=2030-03').expect(200);
    expect(march).toEqual([
      expect.objectContaining({ name: 'Empréstimo Banco', amount: 1000, installmentNumber: 3, loanId }),
    ]);
    expect((await http().get('/transactions/summary?month=2030-03').expect(200)).body.outflow).toBe(1000);
  });

  it('parcelas que já venceram contam como pagas', async () => {
    const { body } = await http()
      .post('/loans')
      .send({ name: 'Antigo', total: 300, installments: 3, firstDueDate: '2020-01-05' })
      .expect(201);
    expect(body).toMatchObject({ paidCount: 3, paid: 300, remaining: 0, nextDueDate: null, interest: null });
  });

  it('editar o nome vale para as parcelas', async () => {
    await http().patch(`/loans/${loanId}`).send({ name: 'Crédito pessoal' }).expect(200);
    const { body } = await http().get('/transactions?month=2030-05').expect(200);
    expect(body[0].name).toBe('Crédito pessoal');
  });

  it('excluir leva as parcelas junto', async () => {
    await http().delete(`/loans/${loanId}`).expect(204);
    expect((await http().get('/transactions?month=2030-05').expect(200)).body).toEqual([]);
    await http().get(`/loans/${loanId}`).expect(404);
  });
});
