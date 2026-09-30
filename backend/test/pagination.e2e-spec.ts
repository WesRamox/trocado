import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Lista de lançamentos paginada: só a página pedida sai do banco
describe('Paginação de lançamentos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let userId: number;

  const get = (path: string) => request(app.getHttpServer()).get(path).auth(token, { type: 'bearer' });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const email = `paginacao-${Date.now()}@teste.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Teste', email, password: 'senha1234' })
      .expect(201);
    userId = registered.body.id;
    token = (await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'senha1234' })).body
      .access_token;

    // Dias 1 a 5 de março, e uma entrada fora do mês
    for (let day = 1; day <= 5; day++) {
      await request(app.getHttpServer())
        .post('/transactions')
        .auth(token, { type: 'bearer' })
        .send({ name: `Compra ${day}`, amount: 10 * day, type: 'OUTFLOW', date: `2030-03-0${day}` })
        .expect(201);
    }
    await request(app.getHttpServer())
      .post('/transactions')
      .auth(token, { type: 'bearer' })
      .send({ name: 'Abril', amount: 99, type: 'OUTFLOW', date: '2030-04-01' })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it('sem page, devolve o mês inteiro como lista', async () => {
    const { body } = await get('/transactions?month=2030-03').expect(200);

    expect(body).toHaveLength(5);
  });

  it('com page, devolve só a página e quantos itens existem ao todo', async () => {
    const { body } = await get('/transactions?month=2030-03&page=1&pageSize=2').expect(200);

    expect(body).toMatchObject({ page: 1, pageSize: 2, totalItems: 5, totalPages: 3 });
    // Do mais recente para o mais antigo
    expect(body.items.map((t: { name: string }) => t.name)).toEqual(['Compra 5', 'Compra 4']);
  });

  it('a última página vem com o que sobrou', async () => {
    const { body } = await get('/transactions?month=2030-03&page=3&pageSize=2').expect(200);

    expect(body.items.map((t: { name: string }) => t.name)).toEqual(['Compra 1']);
  });

  it('uma página além do fim vem vazia, com o total certo', async () => {
    const { body } = await get('/transactions?month=2030-03&page=9&pageSize=2').expect(200);

    expect(body).toMatchObject({ items: [], totalItems: 5, totalPages: 3 });
  });

  it('usa 20 por página quando pageSize não é informado', async () => {
    const { body } = await get('/transactions?month=2030-03&page=1').expect(200);

    expect(body).toMatchObject({ pageSize: 20, totalItems: 5, totalPages: 1 });
    expect(body.items).toHaveLength(5);
  });

  it('mês sem lançamentos tem uma página vazia', async () => {
    const { body } = await get('/transactions?month=2030-06&page=1').expect(200);

    expect(body).toEqual({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });
  });

  it.each(['page=0', 'page=-1', 'page=abc', 'page=1&pageSize=0', 'page=1&pageSize=101'])(
    'rejeita %s',
    async (params) => {
      await get(`/transactions?month=2030-03&${params}`).expect(400);
    },
  );
});
