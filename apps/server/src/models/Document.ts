import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
} from 'sequelize-typescript';
import { env } from '../config/env';

export interface DocumentContent {
  blocks: unknown[];
  icon?: string;
}

// Postgres uses JSONB; sqlite (dev/test) falls back to JSON since JSONB is
// postgres-only in Sequelize.
const JSON_COLUMN_TYPE = env.db.dialect === 'sqlite' ? DataType.JSON : DataType.JSONB;

@Table({ tableName: 'documents', timestamps: true })
export class Document extends Model<Document> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Default('Untitled')
  @Column(DataType.STRING)
  declare title: string;

  @AllowNull(false)
  @Default({ blocks: [] })
  @Column(JSON_COLUMN_TYPE)
  declare content: DocumentContent;

  // Nullable owner reference; the OSS demo runs without auth.
  @AllowNull(true)
  @Column(DataType.STRING)
  declare ownerId: string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}
