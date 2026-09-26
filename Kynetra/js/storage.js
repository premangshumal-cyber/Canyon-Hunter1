(() => {
  const KEYS = {
    settings: 'kynetra_settings',
    history: 'kynetra_history',
    bookmarks: 'kynetra_bookmarks',
    tabs: 'kynetra_tabs',
    downloads: 'kynetra_downloads',
    theme: 'kynetra_theme',
    closedTabs: 'kynetra_closed_tabs'
  };

  const saveData = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const loadData = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const deleteData = (key) => localStorage.removeItem(key);
  const clearData = () => Object.values(KEYS).forEach(deleteData);

  window.KynetraStorage = { KEYS, saveData, loadData, deleteData, clearData };
})();
