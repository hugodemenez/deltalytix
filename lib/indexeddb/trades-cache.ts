import { Trade as PrismaTrade } from "@/prisma/generated/prisma/browser"

const DB_NAME = "deltalytix-cache"
const DB_VERSION = 1
const STORE_NAME = "trades"
const KEY_PREFIX = "trades:"

type CachedTrades = {
  updatedAt: number
  trades: PrismaTrade[]
}

const isBrowser = typeof window !== "undefined" && typeof indexedDB !== "undefined"

async function openDb(): Promise<IDBDatabase | null> {
  if (!isBrowser) return null

  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getTradesCache(userId: string): Promise<PrismaTrade[] | null> {
  const db = await openDb()
  if (!db) return null

  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(`${KEY_PREFIX}${userId}`)

    request.onsuccess = () => {
      const value = request.result as CachedTrades | undefined
      resolve(value?.trades ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function setTradesCache(userId: string, trades: PrismaTrade[]): Promise<void> {
  const db = await openDb()
  if (!db) return

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    store.put({ updatedAt: Date.now(), trades } satisfies CachedTrades, `${KEY_PREFIX}${userId}`)

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearTradesCache(userId: string): Promise<void> {
  const db = await openDb()
  if (!db) return

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    store.delete(`${KEY_PREFIX}${userId}`)

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
