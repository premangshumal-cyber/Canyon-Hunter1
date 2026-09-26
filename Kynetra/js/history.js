(() => {
  class HistoryManager {
    constructor(storage) {
      this.storage = storage;
      this.items = storage.loadData(storage.KEYS.history, []);
    }

    add(entry, isPrivate = false) {
      if (isPrivate || !entry.url) return;
      this.items.unshift({ title: entry.title || entry.url, url: entry.url, timestamp: new Date().toISOString() });
      this.items = this.items.slice(0, 500);
      this.storage.saveData(this.storage.KEYS.history, this.items);
    }

    search(query) {
      const q = query.trim().toLowerCase();
      if (!q) return this.items;
      return this.items.filter((i) => `${i.title} ${i.url}`.toLowerCase().includes(q));
    }

    grouped(items = this.items) {
      const now = new Date();
      const today = [];
      const yesterday = [];
      const week = [];
      const older = [];
      items.forEach((item) => {
        const d = new Date(item.timestamp);
        const diff = Math.floor((now - d) / 86400000);
        if (diff === 0) today.push(item);
        else if (diff === 1) yesterday.push(item);
        else if (diff <= 7) week.push(item);
        else older.push(item);
      });
      return { today, yesterday, week, older };
    }

    remove(ts) {
      this.items = this.items.filter((i) => i.timestamp !== ts);
      this.storage.saveData(this.storage.KEYS.history, this.items);
    }

    clear() {
      this.items = [];
      this.storage.saveData(this.storage.KEYS.history, this.items);
    }
  }

  window.KynetraHistory = HistoryManager;
})();
