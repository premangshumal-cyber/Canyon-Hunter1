(() => {
  class ShortcutsManager {
    constructor(app) {
      this.app = app;
      document.addEventListener('keydown', (e) => this.handle(e));
    }

    handle(e) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const k = e.key.toLowerCase();
      const shift = e.shiftKey;

      if (k === 't' && !shift) { e.preventDefault(); this.app.tabs.newTab(); }
      else if (k === 'w' && !shift) { e.preventDefault(); this.app.tabs.closeTab(this.app.tabs.current().id); }
      else if (k === 't' && shift) { e.preventDefault(); this.app.tabs.reopenClosed(); }
      else if (k === 'l') { e.preventDefault(); document.getElementById('addressBar').focus(); }
      else if (k === 'r') { e.preventDefault(); this.app.reload(); }
      else if (k === 'd') { e.preventDefault(); this.app.addBookmarkCurrent(); }
      else if (k === 'h') { e.preventDefault(); this.app.browser.openInternal('history'); }
      else if (k === 'j') { e.preventDefault(); this.app.toggleDownloads(); }
      else if (k === 'k') { e.preventDefault(); this.app.commands.open(); }
      else if (k === 'f') { e.preventDefault(); this.app.toggleFind(true); }
      else if (k === '=' || k === '+') { e.preventDefault(); this.app.zoom(0.1); }
      else if (k === '-') { e.preventDefault(); this.app.zoom(-0.1); }
      else if (k === '0') { e.preventDefault(); this.app.zoom(0, true); }
      else if (k === 'tab' && !shift) { e.preventDefault(); this.app.cycleTab(1); }
      else if (k === 'tab' && shift) { e.preventDefault(); this.app.cycleTab(-1); }
    }
  }

  window.KynetraShortcuts = ShortcutsManager;
})();
