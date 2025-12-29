import { eq, like } from 'drizzle-orm';
import { getDatabase, schema } from '../db/index.ts';
import type { Game, NewGame, DownloadFile, NewDownloadFile } from '../db/schema.ts';

const { games, downloadFiles } = schema;

// Game CRUD operations
export async function getAllGames(): Promise<Game[]> {
  const db = getDatabase();
  return db.select().from(games).all();
}

export async function getGameById(id: number): Promise<Game | undefined> {
  const db = getDatabase();
  const result = db.select().from(games).where(eq(games.id, id)).get();
  return result;
}

export async function getGameByCode(code: string): Promise<Game | undefined> {
  const db = getDatabase();
  const result = db.select().from(games).where(eq(games.code, code)).get();
  return result;
}

export async function searchGames(query: string): Promise<Game[]> {
  const db = getDatabase();
  return db.select().from(games).where(like(games.name, `%${query}%`)).all();
}

export async function createGame(game: NewGame): Promise<Game> {
  const db = getDatabase();
  const result = db.insert(games).values(game).returning().get();
  return result;
}

export async function updateGame(id: number, updates: Partial<NewGame>): Promise<Game | undefined> {
  const db = getDatabase();
  const result = db
    .update(games)
    .set({ ...updates, updatedAt: new Date().toISOString() })
    .where(eq(games.id, id))
    .returning()
    .get();
  return result;
}

export async function deleteGame(id: number): Promise<void> {
  const db = getDatabase();
  db.delete(games).where(eq(games.id, id)).run();
}

// DownloadFile CRUD operations
export async function getDownloadFilesByGameId(gameId: number): Promise<DownloadFile[]> {
  const db = getDatabase();
  return db.select().from(downloadFiles).where(eq(downloadFiles.gameId, gameId)).all();
}

export async function createDownloadFile(file: NewDownloadFile): Promise<DownloadFile> {
  const db = getDatabase();
  const result = db.insert(downloadFiles).values(file).returning().get();
  return result;
}

export async function updateDownloadFile(
  id: number,
  updates: Partial<NewDownloadFile>
): Promise<DownloadFile | undefined> {
  const db = getDatabase();
  const result = db.update(downloadFiles).set(updates).where(eq(downloadFiles.id, id)).returning().get();
  return result;
}

export async function markFileDownloaded(id: number): Promise<void> {
  const db = getDatabase();
  db.update(downloadFiles).set({ downloaded: true }).where(eq(downloadFiles.id, id)).run();
}

export async function deleteDownloadFilesByGameId(gameId: number): Promise<void> {
  const db = getDatabase();
  db.delete(downloadFiles).where(eq(downloadFiles.gameId, gameId)).run();
}
