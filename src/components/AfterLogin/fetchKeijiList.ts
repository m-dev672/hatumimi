import initSqlJs from 'sql.js';

// ジャンル情報の型定義
export interface KeijiGenre {
  keijitype: number;
  genrecd: number;
  genre_name: string;
};

// public/seed/配下のSQLファイルを読み込んでDBを初期化
async function initializeDatabase(): Promise<Uint8Array> {
  const SQL = await initSqlJs({
    locateFile: file => `https://sql.js.org/dist/${file}`
  });
  
  const db = new SQL.Database();
  
  // 初期化SQLファイルを読み込み
  const response = await fetch('/seed/001_keiji_genres.sql');
  const sqlContent = await response.text();
  
  // SQLを実行
  db.exec(sqlContent);
  
  const data = db.export();
  db.close();
  
  return data;
}

// IndexedDBにkeiji.dbを保存
const saveKeijiDatabase = (dbData: Uint8Array): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('keiji', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keiji')) db.createObjectStore('keiji');
    };
    request.onsuccess = () => {
      const store = request.result.transaction(['keiji'], 'readwrite').objectStore('keiji');
      const putRequest = store.put(dbData, 'keiji.db');
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
};

// IndexedDBからkeiji.dbをロード
const loadKeijiDatabase = (): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('keiji', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keiji')) db.createObjectStore('keiji');
    };
    request.onsuccess = async () => {
      try {
        const db = request.result;
        if (!db.objectStoreNames.contains('keiji')) {
          reject(new Error('Object store "keiji" not found'));
          return;
        }
        const getRequest = db.transaction(['keiji'], 'readonly').objectStore('keiji').get('keiji.db');
        getRequest.onsuccess = async () => {
          try {
            let dbData = getRequest.result;
            if (!dbData) {
              console.log('keiji.db not found, initializing from seed files...');
              dbData = await initializeDatabase();
              await saveKeijiDatabase(dbData);
            }
            resolve(new Uint8Array(dbData));
          } catch (error) {
            reject(error);
          }
        };
        getRequest.onerror = () => reject(getRequest.error);
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// keiji_genresテーブルからジャンル情報を取得
const getKeijiGenres = async (): Promise<KeijiGenre[]> => {
  const dbData = await loadKeijiDatabase();
  const SQL = await initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` });
  const sqlDb = new SQL.Database(dbData);
  const results = sqlDb.exec('SELECT keijitype, genrecd, genre_name FROM keiji_genres');
  const genres = results.length === 0 ? [] : results[0].values.map(row => ({
    keijitype: row[0] as number,
    genrecd: row[1] as number,
    genre_name: row[2] as string
  }));
  sqlDb.close();
  return genres;
};

/**
 * 学内ポータルから掲示一覧を取得する
 */
export const fetchKeijiList = async (): Promise<void> => {
  try {
    const genres = await getKeijiGenres();
    const initialResponse = await fetch('/campusweb/campussquare.do?_flowId=KJW0001100-flow&link=menu-link-mf-135062');
    const firstFlowExecutionKey = new URL(initialResponse.url).searchParams.get('_flowExecutionKey');
    if (!firstFlowExecutionKey) return;

    for (const genre of genres) {
      const params = new URLSearchParams({
        '_flowExecutionKey': firstFlowExecutionKey,
        '_eventId': 'dispKeijiListGenre',
        'keijitype': genre.keijitype.toString(),
        'genrecd': genre.genrecd.toString(),
      });

      const keijiPageHtml = await (await fetch(`/campusweb/campussquare.do?${params}`)).text();
      const doc = new DOMParser().parseFromString(keijiPageHtml, 'text/html');
      const keijiTable = Array.from(doc.querySelectorAll('tbody'))[1];

      if (keijiTable) {
        Array.from(keijiTable.children).forEach((keijiRow) => {
          const keijiAnchorElement = keijiRow.children[1]?.children[0];
          if (!keijiAnchorElement) return;

          const keijiUrl = keijiAnchorElement.getAttribute("href");
          const keijiTitle = keijiAnchorElement.textContent;
          if (!keijiUrl) return;

          const params = new URLSearchParams(keijiUrl.split('?')[1]);
          const keijitype = params.get('keijitype');
          const genrecd = params.get('genrecd');
          const seqNo = params.get('seqNo');

          console.log({ keijitype, genrecd, seqNo, genre_name: genre.genre_name }, keijiTitle);
        });
      }
    }
  } catch (error) {
    console.error('Failed to fetch campus keiji:', error);
  }
};