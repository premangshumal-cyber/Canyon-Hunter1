(() => {
  class SettingsManager {
    constructor(storage) {
      this.storage = storage;
      this.defaults = {
        appearance: { theme: 'dark', accent: '#6366f1', compact: false, rounded: true, themeMode: 'dark' },
        search: { engine: 'google', suggestions: true },
        startup: { mode: 'new-tab', homepage: 'https://www.google.com' },
        privacy: { trackingProtection: true, cookieMode: 'balanced' },
        downloads: { askLocation: false },
        browser: { restoreSession: true, confirmClose: true, showBookmarksBar: true }
      };
      this.data = Object.assign({}, this.defaults, storage.loadData(storage.KEYS.settings, {}));
    }

    get(path) {
      return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), this.data);
    }

    update(path, value) {
      const keys = path.split('.');
      let ref = this.data;
      while (keys.length > 1) ref = ref[keys.shift()];
      ref[keys[0]] = value;
      this.storage.saveData(this.storage.KEYS.settings, this.data);
      document.dispatchEvent(new CustomEvent('kynetra-settings-updated'));
    }

    clearHistory() { this.storage.saveData(this.storage.KEYS.history, []); }
    clearBookmarks() { this.storage.saveData(this.storage.KEYS.bookmarks, []); }
    clearSiteData() { this.storage.deleteData(this.storage.KEYS.tabs); }
  }

  window.KynetraSettings = SettingsManager;
})();
