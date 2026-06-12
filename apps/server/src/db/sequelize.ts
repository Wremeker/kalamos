import { Sequelize } from 'sequelize-typescript';
import { env } from '../config/env';
import { Document } from '../models/Document';

let sequelize: Sequelize | null = null;

export function getSequelize(): Sequelize {
  if (sequelize) return sequelize;

  if (env.db.dialect === 'sqlite') {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: env.db.sqliteStorage,
      logging: false,
      models: [Document],
    });
  } else {
    sequelize = new Sequelize(env.db.url, {
      dialect: 'postgres',
      logging: false,
      models: [Document],
    });
  }

  return sequelize;
}

/** Connect and ensure tables exist. Uses sync() for the reference server; a
 * production deployment would use migrations instead. */
export async function initDatabase(options: { force?: boolean } = {}): Promise<Sequelize> {
  const db = getSequelize();
  await db.authenticate();
  await db.sync({ force: options.force ?? false });
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (sequelize) {
    await sequelize.close();
    sequelize = null;
  }
}
