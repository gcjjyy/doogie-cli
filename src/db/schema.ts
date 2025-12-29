import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const games = sqliteTable('games', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').unique().notNull(),
  genre: text('genre'),
  sourceUrl: text('source_url').notNull(),
  launcherType: text('launcher_type').default('dosbox').notNull(),
  isExtracted: integer('is_extracted', { mode: 'boolean' }).default(false).notNull(),
  localPath: text('local_path'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP').notNull(),
});

export const downloadFiles = sqliteTable('download_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameId: integer('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(),
  downloadUrl: text('download_url'),
  downloaded: integer('downloaded', { mode: 'boolean' }).default(false).notNull(),
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type DownloadFile = typeof downloadFiles.$inferSelect;
export type NewDownloadFile = typeof downloadFiles.$inferInsert;
