import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const clients = await Promise.all(
    [
      { slug: 's-webs', name: 'S-webs' },
      { slug: 'almaty-foods', name: 'Almaty-foods' },
    ].map((item) =>
      prisma.client.upsert({
        where: { slug: item.slug },
        update: { name: item.name, isActive: true },
        create: { ...item, isActive: true },
      }),
    ),
  );

  const botToken = process.env.TELEGRAM_BOT_TOKEN || 'test-token-replace-me';
  await prisma.bot.deleteMany({
    where: { telegramToken: 'test-token-replace-me' },
  });

  const bot = await prisma.bot.upsert({
    where: { telegramToken: botToken },
    update: { name: 'Test Bot', isActive: true },
    create: {
      name: 'Test Bot',
      telegramToken: botToken,
      isActive: true,
    },
  });

  const types = [
    { code: 'price_changed', name: 'Изменение цены' },
    { code: 'stock_threshold', name: 'Порог остатков' },
    { code: 'debtor', name: 'Должники' },
    { code: 'stock_replenished', name: 'Пополнение запасов' },
    { code: 'app_error', name: 'Ошибка приложения' },
  ];

  const notificationTypes = [];
  for (const type of types) {
    notificationTypes.push(
      await prisma.notificationType.upsert({
        where: { code: type.code },
        update: { name: type.name },
        create: type,
      }),
    );
  }

  const chatId = process.env.TELEGRAM_CHAT_ID ?? '-1004373958039';
  const threadId = Number(process.env.TELEGRAM_THREAD_ID ?? '4');

  let rulesCount = 0;
  for (const client of clients) {
    for (const notificationType of notificationTypes) {
      await prisma.routingRule.upsert({
        where: {
          clientId_botId_notificationTypeId_chatId_threadId: {
            clientId: client.id,
            botId: bot.id,
            notificationTypeId: notificationType.id,
            chatId,
            threadId,
          },
        },
        update: { isActive: true },
        create: {
          clientId: client.id,
          botId: bot.id,
          notificationTypeId: notificationType.id,
          chatId,
          threadId,
          isActive: true,
        },
      });
      rulesCount += 1;
    }
  }

  console.log({
    clients: clients.map((client) => client.slug),
    bot: { id: bot.id, name: bot.name },
    chatId,
    threadId,
    rules: rulesCount,
    notificationTypes: notificationTypes.map((type) => type.code),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
