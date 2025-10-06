const openIndexedDatabase = (): Promise<IDBDatabase> => 
  new Promise((resolve, reject) => {
    const request = indexedDB.open('keiji', 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('keiji')) db.createObjectStore('keiji')
      if (!db.objectStoreNames.contains('metadata')) db.createObjectStore('metadata')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

export const saveToIndexedDatabase = async (data: Uint8Array): Promise<void> => {
  const db = await openIndexedDatabase()
  const store = db.transaction(['keiji'], 'readwrite').objectStore('keiji')
  return new Promise<void>((resolve, reject) => {
    const request = store.put(data, 'keiji.db')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const loadFromIndexedDatabase = async (): Promise<Uint8Array | null> => {
  const db = await openIndexedDatabase()
  const store = db.transaction(['keiji'], 'readonly').objectStore('keiji')
  return new Promise((resolve, reject) => {
    const request = store.get('keiji.db')
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

// メタデータをIndexedDBに保存
export const saveMetadata = async (key: string, value: string): Promise<void> => {
  const db = await openIndexedDatabase()
  const store = db.transaction(['metadata'], 'readwrite').objectStore('metadata')
  return new Promise<void>((resolve, reject) => {
    const data = {
      value,
      updated_at: new Date().toISOString()
    }
    const request = store.put(data, key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// メタデータをIndexedDBから取得
export const loadMetadata = async (key: string): Promise<{ value: string; updated_at: string } | null> => {
  const db = await openIndexedDatabase()
  const store = db.transaction(['metadata'], 'readonly').objectStore('metadata')
  return new Promise((resolve, reject) => {
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

// 最終更新時刻をチェックして1時間以内かどうかを判定
export const shouldSkipAutoUpdate = async (): Promise<boolean> => {
  try {
    const metadata = await loadMetadata('last_update')
    if (!metadata) {
      return false // メタデータがない場合は更新を実行
    }
    
    const lastUpdate = new Date(metadata.value)
    const now = new Date()
    const oneHourInMs = 60 * 60 * 1000
    const timeDiff = now.getTime() - lastUpdate.getTime()
    
    return timeDiff < oneHourInMs
  } catch (error) {
    console.error('メタデータの確認に失敗:', error)
    return false // エラーの場合は更新を実行
  }
}

// 最終更新時刻を記録
export const recordLastUpdate = async (): Promise<void> => {
  const now = new Date().toISOString()
  await saveMetadata('last_update', now)
}