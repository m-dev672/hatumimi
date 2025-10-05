import initSqlJs from 'sql.js'
import { saveToIndexedDatabase, loadFromIndexedDatabase } from './indexedDatabase'

export interface KeijiGenre {
  keijitype: number
  genrecd: number
  genre_name: string
}

const createSqlEngine = () => initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` })

const initializeDatabase = async (): Promise<Uint8Array> => {
  const [SQL, ...responses] = await Promise.all([
    createSqlEngine(),
    fetch('/seed/001_keiji_genres.sql'),
    fetch('/seed/002_keiji_data.sql')
  ])
  
  const db = new SQL.Database()
  for (const response of responses) {
    db.exec(await response.text())
  }
  
  const data = db.export()
  db.close()
  return data
}

const loadSqlDatabase = async (): Promise<Uint8Array> => {
  let dbData = await loadFromIndexedDatabase()
  
  if (!dbData) {
    console.log('keiji.db not found, initializing from seed files...')
    dbData = await initializeDatabase()
    await saveToIndexedDatabase(dbData)
  }
  
  return new Uint8Array(dbData)
}

const executeSql = async <T>(query: string, transform?: (row: unknown[]) => T): Promise<T[]> => {
  const [dbData, SQL] = await Promise.all([loadSqlDatabase(), createSqlEngine()])
  const db = new SQL.Database(dbData)
  const results = db.exec(query)
  const data = results[0]?.values.map(transform || (row => row as T)) || []
  db.close()
  return data
}

export const getKeijiGenres = (): Promise<KeijiGenre[]> =>
  executeSql('SELECT keijitype, genrecd, genre_name FROM keiji_genres', row => ({
    keijitype: row[0] as number,
    genrecd: row[1] as number,
    genre_name: row[2] as string
  }))

export interface KeijiData {
  id: number
  keijitype: number
  genrecd: number
  seqNo: string
  genre_name: string
  title: string
  published_at: string
  display_start: string
  display_end: string
  created_at: string
}

export const getKeijiData = (): Promise<KeijiData[]> =>
  executeSql('SELECT id, keijitype, genrecd, seqNo, genre_name, title, published_at, display_start, display_end, created_at FROM keiji_data ORDER BY published_at DESC', row => ({
    id: row[0] as number,
    keijitype: row[1] as number,
    genrecd: row[2] as number,
    seqNo: row[3] as string,
    genre_name: row[4] as string,
    title: row[5] as string,
    published_at: row[6] as string,
    display_start: row[7] as string,
    display_end: row[8] as string,
    created_at: row[9] as string
  }))

export const insertKeijiDataBatch = async (dataList: { keijitype: string; genrecd: string; seqNo: string; genre_name: string; title: string; published_at: string; display_start: string; display_end: string }[]) => {
  if (dataList.length === 0) return
  
  const [dbData, SQL] = await Promise.all([loadSqlDatabase(), createSqlEngine()])
  const db = new SQL.Database(dbData)
  
  const stmt = db.prepare('INSERT OR REPLACE INTO keiji_data (keijitype, genrecd, seqNo, genre_name, title, published_at, display_start, display_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  
  for (const data of dataList) {
    stmt.run([parseInt(data.keijitype), parseInt(data.genrecd), data.seqNo, data.genre_name, data.title, data.published_at, data.display_start, data.display_end])
  }
  
  stmt.free()
  const updatedData = db.export()
  db.close()
  await saveToIndexedDatabase(updatedData)
}

export const deleteExpiredKeiji = async (): Promise<number> => {
  const [dbData, SQL] = await Promise.all([loadSqlDatabase(), createSqlEngine()])
  const db = new SQL.Database(dbData)
  
  const now = new Date().toISOString()
  const stmt = db.prepare('DELETE FROM keiji_data WHERE display_end != "" AND display_end < ?')
  stmt.run([now])
  
  const countResult = db.exec('SELECT changes() as deleted_count')
  const deletedCount = countResult[0]?.values[0]?.[0] as number || 0
  
  stmt.free()
  
  if (deletedCount > 0) {
    const updatedData = db.export()
    db.close()
    await saveToIndexedDatabase(updatedData)
    console.log(`期限切れの掲示 ${deletedCount} 件を削除しました`)
  } else {
    db.close()
  }
  
  return deletedCount
}