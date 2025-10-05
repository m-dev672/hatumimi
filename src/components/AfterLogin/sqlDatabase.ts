import initSqlJs from 'sql.js';
import { saveToIndexedDatabase, loadFromIndexedDatabase } from './indexedDatabase';

export interface KeijiGenre {
  keijitype: number;
  genrecd: number;
  genre_name: string;
}

const createSqlEngine = () => initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` });

const initializeDatabase = async (): Promise<Uint8Array> => {
  const [SQL, ...responses] = await Promise.all([
    createSqlEngine(),
    fetch('/seed/001_keiji_genres.sql'),
    fetch('/seed/002_keiji_data.sql')
  ]);
  
  const db = new SQL.Database();
  for (const response of responses) {
    db.exec(await response.text());
  }
  
  const data = db.export();
  db.close();
  return data;
};

export const loadSqlDatabase = async (): Promise<Uint8Array> => {
  let dbData = await loadFromIndexedDatabase();
  
  if (!dbData) {
    console.log('keiji.db not found, initializing from seed files...');
    dbData = await initializeDatabase();
    await saveToIndexedDatabase(dbData);
  }
  
  return new Uint8Array(dbData);
};

export const executeSql = async <T>(query: string, transform?: (row: any[]) => T): Promise<T[]> => {
  const [dbData, SQL] = await Promise.all([loadSqlDatabase(), createSqlEngine()]);
  const db = new SQL.Database(dbData);
  const results = db.exec(query);
  const data = results[0]?.values.map(transform || (row => row as T)) || [];
  db.close();
  return data;
};

export const getKeijiGenres = (): Promise<KeijiGenre[]> =>
  executeSql('SELECT keijitype, genrecd, genre_name FROM keiji_genres', row => ({
    keijitype: row[0] as number,
    genrecd: row[1] as number,
    genre_name: row[2] as string
  }));

export const insertKeijiData = async (data: { keijitype: string; genrecd: string; seqNo: string; genre_name: string; title: string }) => {
  const [dbData, SQL] = await Promise.all([loadSqlDatabase(), createSqlEngine()]);
  const db = new SQL.Database(dbData);
  
  const stmt = db.prepare('INSERT OR REPLACE INTO keiji_data (keijitype, genrecd, seqNo, genre_name, title) VALUES (?, ?, ?, ?, ?)');
  stmt.run([parseInt(data.keijitype), parseInt(data.genrecd), data.seqNo, data.genre_name, data.title]);
  stmt.free();
  
  const updatedData = db.export();
  db.close();
  await saveToIndexedDatabase(updatedData);
};