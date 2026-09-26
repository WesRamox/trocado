import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { addMonths, formatDate, today } from '../src/common/date.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RecurrencesScheduler } from '../src/recurrences/recurrences.scheduler.js';

const TIMEZONE = 'Asia/Tokyo';

describe('Recorrências (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let userId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const email = `recorrencias-${Date.now()}@teste.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Teste', email, password: 'senha1234', timezone: TIMEZONE })
      .expect(201);
    userId = registered.body.id;
    expect(registered.body.timezone).toBe(TIMEZONE);

    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'senha1234' });
    token = login.body.access_token;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  const api = () => ({
    get: (path: string) => request(app.getHttpServer()).get(path).auth(token, { type: 'bearer' }),
    post: (path: string) => request(app.getHttpServer()).post(path).auth(token, { type: 'bearer' }),
    patch: (path: string) => request(app.getHttpServer()).patch(path).auth(token, { type: 'bearer' }),
  });

  it('registra o job de hora em hora', () => {
    const jobs = [...app.get(SchedulerRegistry).getCronJobs().values()];
    expect(jobs.map((job) => job.cronTime.source)).toContain('0 0-23/1 * * *');
  });

  it('recusa fuso inválido no perfil', async () => {
    await api().patch('/auth/profile').send({ timezone: 'Lua/Base' }).expect(400);
  });

  it('gera na criação, não gera em GET, e o job repõe o que falta', async () => {
    // Começa há 2 meses no fuso da pessoa: 3 ocorrências já venceram (inclusive a de hoje)
    const todayThere = today(TIMEZONE);
    const startDate = addMonths(todayThere, -2);
    const created = await api()
      .post('/recurrences')
      .send({ name: 'Aluguel', amount: 1500, type: 'OUTFLOW', frequency: 'MONTHLY', startDate: formatDate(startDate) })
      .expect(201);
    const recurrenceId = created.body.id;
    const count = () => prisma.transaction.count({ where: { recurrenceId } });

    expect(await count()).toBe(3);
    expect(created.body.lastGeneratedDate).toBe(formatDate(addMonths(startDate, 2)));

    // Volta ao estado "nada gerado" e confere que as leituras não gravam
    await prisma.transaction.deleteMany({ where: { recurrenceId } });
    await prisma.recurrence.update({ where: { id: recurrenceId }, data: { lastGeneratedDate: null } });
    const month = formatDate(todayThere).slice(0, 7);
    await api().get(`/transactions?month=${month}`).expect(200);
    await api().get('/transactions/summary').expect(200);
    await api().get(`/transactions/summary/history?from=${formatDate(startDate).slice(0, 7)}&to=${month}`).expect(200);
    expect(await count()).toBe(0);

    await app.get(RecurrencesScheduler).generateDue();
    expect(await count()).toBe(3);

    // Rodar de novo não duplica
    await app.get(RecurrencesScheduler).generateDue();
    expect(await count()).toBe(3);
  });
});
