import { createApp } from './app';
import { initDatabase } from './db/sequelize';
import { env } from './config/env';

async function main(): Promise<void> {
  await initDatabase();
  const app = createApp();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`kalamos server listening on ${env.publicBaseUrl} (port ${env.port})`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
