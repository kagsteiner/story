const DB_NAME = 'storytellers-v2';
const STORE = 'stories';
const VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('last_modified', 'last_modified');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = fn(store);
    tx.oncomplete = () => resolve(result?.result ?? result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function listStories() {
  return withStore('readonly', (store) =>
    new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const stories = (req.result || []).sort((a, b) => b.last_modified - a.last_modified);
        resolve(stories);
      };
      req.onerror = () => reject(req.error);
    })
  );
}

export async function getStory(id) {
  return withStore('readonly', (store) =>
    new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    })
  );
}

export async function saveStory(story) {
  story.last_modified = Date.now();
  return withStore('readwrite', (store) => store.put(story));
}

export async function createStory(title = 'Untitled') {
  const story = {
    id: crypto.randomUUID(),
    title,
    content_markdown: '',
    story_intent: '',
    chapter_intent: '',
    last_modified: Date.now(),
  };
  await saveStory(story);
  return story;
}
