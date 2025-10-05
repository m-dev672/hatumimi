import initSqlJs from 'sql.js';

// 科目情報の型定義
export interface Course {
  courseName: string;
  category: string | undefined;
  units: number | undefined;
};

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

// IndexedDBにnotices.dbを保存
async function saveNoticesDbToIndexedDB(dbData: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('notices', 1);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('notices')) {
        db.createObjectStore('notices');
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['notices'], 'readwrite');
      const store = transaction.objectStore('notices');
      
      const putRequest = store.put(dbData, 'notices.db');
      
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// IndexedDBからnotices.dbを取得してkeiji_genresテーブルのデータを読み込む
async function getKeijiGenres(): Promise<KeijiGenre[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('notices', 1);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('notices')) {
        db.createObjectStore('notices');
      }
    };
    
    request.onsuccess = async () => {
      try {
        const db = request.result;
        
        // オブジェクトストアが存在するかチェック
        if (!db.objectStoreNames.contains('notices')) {
          reject(new Error('Object store "notices" not found'));
          return;
        }
        
        const transaction = db.transaction(['notices'], 'readonly');
        const store = transaction.objectStore('notices');
        const getRequest = store.get('notices.db');
        
        getRequest.onsuccess = async () => {
          try {
            let dbData = getRequest.result;
            
            // DBが存在しない場合はSQLファイルから初期化
            if (!dbData) {
              console.log('notices.db not found, initializing from seed files...');
              dbData = await initializeDatabase();
              await saveNoticesDbToIndexedDB(dbData);
            }
            
            const SQL = await initSqlJs({
              locateFile: file => `https://sql.js.org/dist/${file}`
            });
            
            const sqlDb = new SQL.Database(new Uint8Array(dbData));
            const results = sqlDb.exec('SELECT keijitype, genrecd, genre_name FROM keiji_genres');
            
            if (results.length === 0) {
              resolve([]);
              return;
            }
            
            const genres: KeijiGenre[] = results[0].values.map(row => ({
              keijitype: row[0] as number,
              genrecd: row[1] as number,
              genre_name: row[2] as string
            }));
            
            sqlDb.close();
            resolve(genres);
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
}

/**
 * 過去履修した授業を学内ポータルの成績情報ページから取得する
 */
export async function getCompletedCourses(): Promise<void> {
  try {
    // DBから全ジャンルを取得
    const genres = await getKeijiGenres();
    
    const initialResponse = await fetch('/campusweb/campussquare.do?_flowId=KJW0001100-flow&link=menu-link-mf-135062')

    const url = new URL(initialResponse.url);
    const firstFlowExecutionKey = url.searchParams.get('_flowExecutionKey');
    if (firstFlowExecutionKey === null) {
      return;
    }

    // 各ジャンルについてデータを取得
    for (const genre of genres) {
      const params = new URLSearchParams({
        '_flowExecutionKey': firstFlowExecutionKey,
        '_eventId': 'dispKeijiListGenre',
        'keijitype': genre.keijitype.toString(),
        'genrecd': genre.genrecd.toString(),
      })

      const forumPage = await fetch(`/campusweb/campussquare.do?${params}`, {
        method: 'GET'
      });

      const forumPageHtml = await forumPage.text()
      const parser = new DOMParser();
      const doc = parser.parseFromString(forumPageHtml, 'text/html');

      const noticesTable = Array.from(doc.querySelectorAll('tbody'))[1]

      if (noticesTable) {
        Array.from(noticesTable.children).forEach((notice) => {
          // 安全なアクセスでエラーを防ぐ
          const secondCell = notice.children[1];
          if (!secondCell) return;
          
          const noticeAnchorElement = secondCell.children[0];
          if (!noticeAnchorElement) return;

          const noticeUrl = noticeAnchorElement.getAttribute("href")
          const noticeTitle = noticeAnchorElement.textContent
          if (noticeUrl === null) { return }

          const queryString = noticeUrl.split('?')[1];
          const params = new URLSearchParams(queryString);

          const keijitype = params.get('keijitype');
          const genrecd = params.get('genrecd');
          const seqNo = params.get('seqNo');

          console.log({ keijitype, genrecd, seqNo, genre_name: genre.genre_name }, noticeTitle);
        })
      }
    }
  } catch (error) {
    console.error('Failed to get completed courses:', error);
  }
}