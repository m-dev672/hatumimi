const openIndexedDatabase = (): Promise<IDBDatabase> => 
  new Promise((resolve, reject) => {
    const request = indexedDB.open('keiji', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('keiji')) db.createObjectStore('keiji')
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