import type { ReviewDocument, StoredPreferences } from "./types";

const DATABASE = "legalease-browser-v1";
const VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser does not support local document storage."));
      return;
    }
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("documents")) {
        const documents = db.createObjectStore("documents", { keyPath: "id" });
        documents.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("preferences")) db.createObjectStore("preferences", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local document storage."));
  });
}

async function withStore<T>(storeName: "documents" | "preferences", mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local storage could not complete the request."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local storage was interrupted."));
    transaction.oncomplete = () => db.close();
  });
}

export async function listDocuments(): Promise<ReviewDocument[]> {
  const all = await withStore("documents", "readonly", (store) => store.getAll());
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getDocument(id: string): Promise<ReviewDocument | undefined> {
  return withStore("documents", "readonly", (store) => store.get(id));
}

export function saveDocument(document: ReviewDocument): Promise<IDBValidKey> {
  return withStore("documents", "readwrite", (store) => store.put(document));
}

export function removeDocument(id: string): Promise<undefined> {
  return withStore("documents", "readwrite", (store) => store.delete(id));
}

export async function clearDocuments(): Promise<void> {
  await withStore("documents", "readwrite", (store) => store.clear());
}

const defaultPreferences: StoredPreferences = { id: "main", language: "English", rememberHistory: true };

export async function getPreferences(): Promise<StoredPreferences> {
  const value = await withStore<StoredPreferences | undefined>("preferences", "readonly", (store) => store.get("main"));
  return value ?? defaultPreferences;
}

export function savePreferences(preferences: StoredPreferences): Promise<IDBValidKey> {
  return withStore("preferences", "readwrite", (store) => store.put(preferences));
}

export async function clearAllLocalData(): Promise<void> {
  await clearDocuments();
  await withStore("preferences", "readwrite", (store) => store.clear());
}