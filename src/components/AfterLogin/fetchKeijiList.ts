import initSqlJs from 'sql.js';

// ジャンル情報の型定義
export interface KeijiGenre {
  keijitype: number;
  genrecd: number;
  genre_name: string;
};

// public/seed/配下のSQLファイルを読み込んでDBを初期化
async function initializeDatabase(): Promise<Uint8Array> {
  const [SQL, response] = await Promise.all([
    createSqlEngine(),
    fetch('/seed/001_keiji_genres.sql')
  ]);
  
  const db = new SQL.Database();
  const sqlContent = await response.text();
  db.exec(sqlContent);
  
  const data = db.export();
  db.close();
  return data;
}

// IndexedDBの操作を統一したヘルパー関数
const openKeijiDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('keiji', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keiji')) db.createObjectStore('keiji');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// IndexedDBにkeiji.dbを保存
const saveKeijiDatabase = async (dbData: Uint8Array): Promise<void> => {
  const db = await openKeijiDatabase();
  const store = db.transaction(['keiji'], 'readwrite').objectStore('keiji');
  
  return new Promise((resolve, reject) => {
    const putRequest = store.put(dbData, 'keiji.db');
    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject(putRequest.error);
  });
};

// IndexedDBからkeiji.dbをロード
const loadKeijiDatabase = async (): Promise<Uint8Array> => {
  const db = await openKeijiDatabase();
  const store = db.transaction(['keiji'], 'readonly').objectStore('keiji');
  
  return new Promise(async (resolve, reject) => {
    const getRequest = store.get('keiji.db');
    getRequest.onsuccess = async () => {
      let dbData = getRequest.result;
      if (!dbData) {
        console.log('keiji.db not found, initializing from seed files...');
        dbData = await initializeDatabase();
        await saveKeijiDatabase(dbData);
      }
      resolve(new Uint8Array(dbData));
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};

// SQLエンジンを作成
const createSqlEngine = async () => {
  return await initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` });
};

// keiji_genresテーブルからジャンル情報を取得
const getKeijiGenres = async (): Promise<KeijiGenre[]> => {
  const [dbData, SQL] = await Promise.all([loadKeijiDatabase(), createSqlEngine()]);
  const sqlDb = new SQL.Database(dbData);
  const results = sqlDb.exec('SELECT keijitype, genrecd, genre_name FROM keiji_genres');
  const genres = results[0]?.values.map(row => ({
    keijitype: row[0] as number,
    genrecd: row[1] as number,
    genre_name: row[2] as string
  })) || [];
  sqlDb.close();
  return genres;
};

// 掲示情報を抽出
const extractKeijiData = (genre: KeijiGenre, keijiRow: Element) => {
  const anchor = keijiRow.children[1]?.children[0] as HTMLAnchorElement;
  if (!anchor?.href) return null;
  
  const urlParams = new URLSearchParams(anchor.href.split('?')[1]);
  return {
    keijitype: urlParams.get('keijitype'),
    genrecd: urlParams.get('genrecd'),
    seqNo: urlParams.get('seqNo'),
    genre_name: genre.genre_name,
    title: anchor.textContent
  };
};

// ジャンル別掲示リストを取得
const fetchGenreKeiji = async (genre: KeijiGenre, flowKey: string) => {
  const params = new URLSearchParams({
    _flowExecutionKey: flowKey,
    _eventId: 'dispKeijiListGenre',
    keijitype: genre.keijitype.toString(),
    genrecd: genre.genrecd.toString()
  });
  
  const html = await fetch(`/campusweb/campussquare.do?${params}`).then(r => r.text());
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelectorAll('tbody')[1];
  
  if (!table) return;
  
  Array.from(table.children).forEach(row => {
    const data = extractKeijiData(genre, row);
    if (data) console.log(data);
  });
};

export const fetchKeijiList = async (): Promise<void> => {
  try {
    const [genres, response] = await Promise.all([
      getKeijiGenres(),
      fetch('/campusweb/campussquare.do?_flowId=KJW0001100-flow&link=menu-link-mf-135062')
    ]);
    
    const flowKey = new URL(response.url).searchParams.get('_flowExecutionKey');
    if (!flowKey) return;
    
    await Promise.all(genres.map(genre => fetchGenreKeiji(genre, flowKey)));
  } catch (error) {
    console.error('Failed to fetch campus keiji:', error);
  }
};