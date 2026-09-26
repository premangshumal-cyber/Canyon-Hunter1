(() => {
  class BookmarksManager {
    constructor(storage) {
      this.storage = storage;
      this.items = storage.loadData(storage.KEYS.bookmarks, [
        { id: 'f-main', type: 'folder', name: 'Favorites', parentId: null },
        { id: 'b1', type: 'bookmark', title: 'Google', url: 'https://www.google.com', parentId: 'f-main' },
        { id: 'b2', type: 'bookmark', title: 'YouTube', url: 'https://www.youtube.com', parentId: 'f-main' },
        { id: 'b3', type: 'bookmark', title: 'GitHub', url: 'https://github.com', parentId: 'f-main' }
      ]);
    }

    persist() {
      this.storage.saveData(this.storage.KEYS.bookmarks, this.items);
    }

    addBookmark(title, url, parentId = 'f-main') {
      const id = `b-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
      this.items.push({ id, type: 'bookmark', title, url, parentId });
      this.persist();
    }

    addFolder(name, parentId = null) {
      const id = `f-${Date.now()}`;
      this.items.push({ id, type: 'folder', name, parentId });
      this.persist();
    }

    editBookmark(id, updates) {
      const item = this.items.find((i) => i.id === id && i.type === 'bookmark');
      if (!item) return;
      Object.assign(item, updates);
      this.persist();
    }

    remove(id) {
      const toDelete = new Set([id]);
      const queue = [id];
      while (queue.length) {
        const current = queue.shift();
        this.items.filter((i) => i.parentId === current).forEach((c) => {
          toDelete.add(c.id);
          queue.push(c.id);
        });
      }
      this.items = this.items.filter((i) => !toDelete.has(i.id));
      this.persist();
    }

    search(q) {
      const query = q.trim().toLowerCase();
      return this.items.filter((i) => i.type === 'bookmark' && `${i.title} ${i.url}`.toLowerCase().includes(query));
    }

    folderChildren(id = null) {
      return this.items.filter((i) => i.parentId === id);
    }

    allBookmarks() {
      return this.items.filter((i) => i.type === 'bookmark');
    }
  }

  window.KynetraBookmarks = BookmarksManager;
})();
