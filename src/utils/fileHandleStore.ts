/**
 * IndexedDB utility for persisting FileSystemFileHandle across sessions.
 * File handles cannot be stored in localStorage (not serializable),
 * but IndexedDB supports structured clone algorithm which handles them.
 */

const DB_NAME = 'yohaku_fs';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const HANDLE_KEY = 'current_file_handle';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveFileHandle(handle: FileSystemFileHandle): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function loadFileHandle(): Promise<FileSystemFileHandle | null> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
            req.onsuccess = () => resolve((req.result as FileSystemFileHandle) ?? null);
            req.onerror = () => reject(req.error);
        });
    } catch {
        return null;
    }
}

export async function clearFileHandle(): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve(); // silent fail
        });
    } catch {
        // silent fail
    }
}

/**
 * Verify the handle still has write permission (needed after page reload).
 * Returns true if permission is granted.
 */
export async function verifyHandlePermission(handle: FileSystemFileHandle): Promise<boolean> {
    try {
        // @ts-ignore — queryPermission is part of File System Access API
        const state = await handle.queryPermission({ mode: 'readwrite' });
        if (state === 'granted') return true;
        // @ts-ignore
        const requested = await handle.requestPermission({ mode: 'readwrite' });
        return requested === 'granted';
    } catch {
        return false;
    }
}
