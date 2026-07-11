'use strict';

window.CLDFLocalStore = (() => {
  const DB_NAME = 'cldf-offline-data';
  const DB_VERSION = 2;
  const FP_STORE = 'fingerprints';
  const CATALOG_STORE = 'catalogs';
  let dbPromise = null;

  function requestAsPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB-Anfrage fehlgeschlagen.'));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('IndexedDB-Transaktion fehlgeschlagen.'));
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB-Transaktion wurde abgebrochen.'));
    });
  }

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('Der Browser unterstützt keinen großen lokalen Datenspeicher.'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(FP_STORE)) {
          const store = db.createObjectStore(FP_STORE, { keyPath: 'id' });
          store.createIndex('songKey', 'songKey', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(CATALOG_STORE)) {
          db.createObjectStore(CATALOG_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error('Lokaler Datenspeicher konnte nicht geöffnet werden.'));
    });
    return dbPromise;
  }

  async function getAllFingerprints() {
    const db = await open();
    const tx = db.transaction(FP_STORE, 'readonly');
    const values = await requestAsPromise(tx.objectStore(FP_STORE).getAll());
    await transactionDone(tx);
    return Array.isArray(values) ? values : [];
  }

  async function putFingerprint(entry) {
    const db = await open();
    const tx = db.transaction(FP_STORE, 'readwrite');
    tx.objectStore(FP_STORE).put(entry);
    await transactionDone(tx);
    return entry;
  }

  async function putFingerprints(entries) {
    const db = await open();
    const tx = db.transaction(FP_STORE, 'readwrite');
    const store = tx.objectStore(FP_STORE);
    for (const entry of entries || []) store.put(entry);
    await transactionDone(tx);
    return entries?.length || 0;
  }

  async function deleteFingerprint(id) {
    const db = await open();
    const tx = db.transaction(FP_STORE, 'readwrite');
    tx.objectStore(FP_STORE).delete(id);
    await transactionDone(tx);
  }

  async function clearFingerprints() {
    const db = await open();
    const tx = db.transaction(FP_STORE, 'readwrite');
    tx.objectStore(FP_STORE).clear();
    await transactionDone(tx);
  }

  async function getCatalog(id) {
    const db = await open();
    const tx = db.transaction(CATALOG_STORE, 'readonly');
    const value = await requestAsPromise(tx.objectStore(CATALOG_STORE).get(id));
    await transactionDone(tx);
    return value?.payload || null;
  }

  async function putCatalog(id, payload) {
    const db = await open();
    const tx = db.transaction(CATALOG_STORE, 'readwrite');
    tx.objectStore(CATALOG_STORE).put({ id, payload, savedAt: new Date().toISOString() });
    await transactionDone(tx);
  }

  async function deleteCatalog(id) {
    const db = await open();
    const tx = db.transaction(CATALOG_STORE, 'readwrite');
    tx.objectStore(CATALOG_STORE).delete(id);
    await transactionDone(tx);
  }

  function serializeFingerprint(entry) {
    return {
      ...entry,
      hashes: Array.from(entry.hashes || []),
      times: Array.from(entry.times || []),
    };
  }

  function hydrateFingerprint(entry) {
    if (!entry || typeof entry !== 'object') throw new Error('Ungültiger Fingerprint-Eintrag.');
    const hashes = entry.hashes instanceof Uint32Array ? entry.hashes : Uint32Array.from(entry.hashes || []);
    const times = entry.times instanceof Uint16Array ? entry.times : Uint16Array.from(entry.times || []);
    if (!entry.id || !entry.title || hashes.length !== times.length || hashes.length < 20) {
      throw new Error('Fingerprint-Eintrag ist unvollständig.');
    }
    return { ...entry, hashes, times };
  }

  async function exportFingerprints() {
    const entries = await getAllFingerprints();
    return {
      format: 'CLDF-AUDIO-FINGERPRINTS',
      version: 2,
      algorithm: 'cldf-landmark-v1',
      exportedAt: new Date().toISOString(),
      count: entries.length,
      entries: entries.map(serializeFingerprint),
    };
  }

  async function importFingerprints(payload) {
    if (payload?.format !== 'CLDF-AUDIO-FINGERPRINTS' || !Array.isArray(payload.entries)) {
      throw new Error('Die Datei ist keine CLDF-Audio-Fingerprint-Sicherung.');
    }
    if (payload.entries.length > 5000) throw new Error('Die Fingerprint-Datei enthält zu viele Einträge.');
    const hydrated = payload.entries.map(hydrateFingerprint);
    await putFingerprints(hydrated);
    return hydrated.length;
  }

  return {
    open,
    getAllFingerprints,
    putFingerprint,
    putFingerprints,
    deleteFingerprint,
    clearFingerprints,
    getCatalog,
    putCatalog,
    deleteCatalog,
    exportFingerprints,
    importFingerprints,
    hydrateFingerprint,
  };
})();
