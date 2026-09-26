(() => {
  class DownloadsManager {
    constructor(storage) {
      this.storage = storage;
      this.items = storage.loadData(storage.KEYS.downloads, []);
      this.timers = new Map();
    }

    persist() {
      this.storage.saveData(this.storage.KEYS.downloads, this.items);
    }

    start(url) {
      const fileName = (url.split('/').pop() || 'download.bin').split('?')[0] || 'download.bin';
      const sizeMb = (Math.random() * 25 + 1).toFixed(1);
      const id = `d-${Date.now()}`;
      const item = { id, url, fileName, sizeMb, progress: 0, status: 'Downloading' };
      this.items.unshift(item);
      this.persist();
      const timer = setInterval(() => {
        item.progress = Math.min(100, item.progress + Math.floor(Math.random() * 21));
        if (item.progress >= 100) {
          item.status = 'Completed';
          clearInterval(timer);
          this.timers.delete(id);
        }
        this.persist();
        document.dispatchEvent(new CustomEvent('kynetra-downloads-updated'));
      }, 550);
      this.timers.set(id, timer);
      return item;
    }

    cancel(id) {
      const item = this.items.find((i) => i.id === id);
      if (!item) return;
      item.status = 'Canceled';
      if (this.timers.has(id)) {
        clearInterval(this.timers.get(id));
        this.timers.delete(id);
      }
      this.persist();
    }

    remove(id) {
      this.cancel(id);
      this.items = this.items.filter((i) => i.id !== id);
      this.persist();
    }

    clear() {
      this.timers.forEach(clearInterval);
      this.timers.clear();
      this.items = [];
      this.persist();
    }
  }

  window.KynetraDownloads = DownloadsManager;
})();
