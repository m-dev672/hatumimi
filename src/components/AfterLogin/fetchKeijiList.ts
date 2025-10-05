import initSqlJs from 'sql.js';

export interface KeijiGenre {
  keijitype: number;
  genrecd: number;
  genre_name: string;
}

const createSqlEngine = () => initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` });

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('keiji', 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains('keiji')) db.createObjectStore('keiji');
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const dbOperation = async (mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest) => {
  const db = await openDatabase();
  const store = db.transaction(['keiji'], mode).objectStore('keiji');
  return new Promise((resolve, reject) => {
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

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

const loadDatabase = async (): Promise<Uint8Array> => {
  let dbData = await dbOperation('readonly', store => store.get('keiji.db')) as Uint8Array;
  
  if (!dbData) {
    console.log('keiji.db not found, initializing from seed files...');
    dbData = await initializeDatabase();
    await dbOperation('readwrite', store => store.put(dbData, 'keiji.db'));
  }
  
  return new Uint8Array(dbData);
};

const executeSql = async <T>(query: string, transform?: (row: any[]) => T): Promise<T[]> => {
  const [dbData, SQL] = await Promise.all([loadDatabase(), createSqlEngine()]);
  const db = new SQL.Database(dbData);
  const results = db.exec(query);
  const data = results[0]?.values.map(transform || (row => row as T)) || [];
  db.close();
  return data;
};

const getKeijiGenres = (): Promise<KeijiGenre[]> =>
  executeSql('SELECT keijitype, genrecd, genre_name FROM keiji_genres', row => ({
    keijitype: row[0] as number,
    genrecd: row[1] as number,
    genre_name: row[2] as string
  }));

const insertKeijiData = async (data: { keijitype: string; genrecd: string; seqNo: string; genre_name: string; title: string }) => {
  const [dbData, SQL] = await Promise.all([loadDatabase(), createSqlEngine()]);
  const db = new SQL.Database(dbData);
  
  const stmt = db.prepare('INSERT OR REPLACE INTO keiji_data (keijitype, genrecd, seqNo, genre_name, title) VALUES (?, ?, ?, ?, ?)');
  stmt.run([parseInt(data.keijitype), parseInt(data.genrecd), data.seqNo, data.genre_name, data.title]);
  stmt.free();
  
  const updatedData = db.export();
  db.close();
  await dbOperation('readwrite', store => store.put(updatedData, 'keiji.db'));
};

const extractKeijiData = (genre: KeijiGenre, row: Element) => {
  const anchor = row.children[1]?.children[0] as HTMLAnchorElement;
  if (!anchor?.href || !anchor.textContent) return null;
  
  const params = new URLSearchParams(anchor.href.split('?')[1]);
  const [keijitype, genrecd, seqNo] = ['keijitype', 'genrecd', 'seqNo'].map(key => params.get(key));
  
  return keijitype && genrecd && seqNo ? { keijitype, genrecd, seqNo, genre_name: genre.genre_name, title: anchor.textContent } : null;
};

const fetchGenreKeiji = async (genre: KeijiGenre, flowKey: string) => {
  const params = new URLSearchParams({
    _flowExecutionKey: flowKey,
    _eventId: 'dispKeijiListGenre',
    keijitype: genre.keijitype.toString(),
    genrecd: genre.genrecd.toString()
  });
  
  const html = await fetch(`/campusweb/campussquare.do?${params}`).then(r => r.text());
  const table = new DOMParser().parseFromString(html, 'text/html').querySelectorAll('tbody')[1];
  
  if (table) {
    const insertPromises = Array.from(table.children)
      .map(row => extractKeijiData(genre, row))
      .filter(Boolean)
      .map(data => insertKeijiData(data!));
    
    await Promise.all(insertPromises);
  }
};

export const fetchKeijiList = async (): Promise<void> => {
  try {
    const [genres, response] = await Promise.all([
      getKeijiGenres(),
      fetch('/campusweb/campussquare.do?_flowId=KJW0001100-flow&link=menu-link-mf-135062')
    ]);
    
    const flowKey = new URL(response.url).searchParams.get('_flowExecutionKey');
    if (flowKey) {
      await Promise.all(genres.map(genre => fetchGenreKeiji(genre, flowKey)));
    }
  } catch (error) {
    console.error('Failed to fetch campus keiji:', error);
  }
};