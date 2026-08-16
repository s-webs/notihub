import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  const prisma = {
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    $queryRaw: () => Promise.resolve([{ '?column?': 1 }]),
    client: {
      findUnique: () => Promise.resolve(null),
    },
    notificationType: {
      findUnique: () => Promise.resolve(null),
    },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('/health/ready (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect({ status: 'ok', postgres: true, redis: true });
  });

  it('/events (POST) rejects invalid payload', () => {
    return request(app.getHttpServer())
      .post('/events')
      .send({ client: 's-webs' })
      .expect(400);
  });

  it('/events (POST) returns 404 for unknown client', () => {
    return request(app.getHttpServer())
      .post('/events')
      .send({ client: 'unknown', type: 'price_changed', payload: {} })
      .expect(404);
  });

  it('/api/admin/clients (GET) requires basic auth', () => {
    return request(app.getHttpServer()).get('/api/admin/clients').expect(401);
  });

  it('/webhooks/glitchtip (POST) requires a configured secret', () => {
    return request(app.getHttpServer())
      .post('/webhooks/glitchtip?client=almaty-foods')
      .send({ message: 'boom' })
      .expect(401);
  });

  it('/webhooks/glitchtip (POST) requires client query', () => {
    return request(app.getHttpServer())
      .post('/webhooks/glitchtip')
      .send({ message: 'boom' })
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
