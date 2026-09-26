(() => {
  class TabsManager {
    constructor(storage, app) {
      this.storage = storage;
      this.app = app;
      this.el = document.getElementById('tabStrip');
      this.closed = storage.loadData(storage.KEYS.closedTabs, []);
      this.state = storage.loadData(storage.KEYS.tabs, { activeId: null, tabs: [] });
      if (!this.state.tabs.length) this.newTab();
      this.bindDnD();
    }

    persist() {
      const storable = {
        activeId: this.state.activeId,
        tabs: this.state.tabs.filter((t) => !t.isPrivate)
      };
      this.storage.saveData(this.storage.KEYS.tabs, storable);
      this.storage.saveData(this.storage.KEYS.closedTabs, this.closed.slice(0, 30));
    }

    current() {
      return this.state.tabs.find((t) => t.id === this.state.activeId);
    }

    newTab(isPrivate = false, url = 'internal:newtab') {
      const tab = {
        id: `t-${Date.now()}-${Math.random().toString(16).slice(2, 5)}`,
        title: isPrivate ? 'Private Tab' : 'New Tab',
        url,
        history: [url],
        historyIndex: 0,
        pinned: false,
        loading: false,
        isPrivate,
        type: url.startsWith('internal:') ? 'internal' : 'web'
      };
      this.state.tabs.push(tab);
      this.state.activeId = tab.id;
      this.persist();
      this.render();
      this.app.syncTabView();
      return tab;
    }

    closeTab(id) {
      const idx = this.state.tabs.findIndex((t) => t.id === id);
      if (idx === -1) return;
      const [tab] = this.state.tabs.splice(idx, 1);
      this.closed.unshift({ ...tab, closedAt: Date.now() });
      if (!this.state.tabs.length) this.newTab();
      if (this.state.activeId === id) this.state.activeId = this.state.tabs[Math.max(0, idx - 1)].id;
      this.persist();
      this.render();
      this.app.syncTabView();
    }

    switchTab(id) {
      this.state.activeId = id;
      this.persist();
      this.render();
      this.app.syncTabView();
    }

    pushHistory(url) {
      const t = this.current();
      if (!t) return;
      t.history = t.history.slice(0, t.historyIndex + 1);
      t.history.push(url);
      t.historyIndex = t.history.length - 1;
    }

    back() {
      const t = this.current();
      if (!t || t.historyIndex <= 0) return;
      t.historyIndex -= 1;
      this.app.browser.navigate(t.history[t.historyIndex], { timeout: 5000 });
    }

    forward() {
      const t = this.current();
      if (!t || t.historyIndex >= t.history.length - 1) return;
      t.historyIndex += 1;
      this.app.browser.navigate(t.history[t.historyIndex], { timeout: 5000 });
    }

    duplicate(id) {
      const t = this.state.tabs.find((x) => x.id === id);
      if (!t) return;
      const copy = { ...t, id: `t-${Date.now()}`, history: [...t.history], isPrivate: t.isPrivate };
      this.state.tabs.splice(this.state.tabs.indexOf(t) + 1, 0, copy);
      this.state.activeId = copy.id;
      this.persist();
      this.render();
      this.app.syncTabView();
    }

    reopenClosed() {
      const tab = this.closed.shift();
      if (!tab) return;
      tab.id = `t-${Date.now()}`;
      this.state.tabs.push(tab);
      this.state.activeId = tab.id;
      this.persist();
      this.render();
      this.app.syncTabView();
    }

    togglePin(id) {
      const t = this.state.tabs.find((x) => x.id === id);
      if (!t) return;
      t.pinned = !t.pinned;
      this.state.tabs.sort((a, b) => Number(b.pinned) - Number(a.pinned));
      this.persist();
      this.render();
    }

    closeOthers(id) {
      this.state.tabs = this.state.tabs.filter((t) => t.id === id);
      this.state.activeId = id;
      this.persist();
      this.render();
      this.app.syncTabView();
    }

    render() {
      this.el.innerHTML = '';
      this.state.tabs.forEach((tab) => {
        const node = document.createElement('div');
        node.className = `tab ${tab.id === this.state.activeId ? 'active' : ''} ${tab.pinned ? 'pinned' : ''} ${tab.loading ? 'loading' : ''}`;
        node.draggable = true;
        node.dataset.tabId = tab.id;
        node.innerHTML = `
          <span class="dot"></span>
          ${tab.pinned ? '' : `<span class="tab-title">${tab.isPrivate ? '🕶 ' : ''}${tab.title}</span>`}
          <button class="close icon-btn" title="Close">×</button>
        `;
        node.addEventListener('click', (e) => {
          if (e.target.closest('.close')) this.closeTab(tab.id);
          else this.switchTab(tab.id);
        });
        node.addEventListener('contextmenu', (e) => this.app.showTabMenu(e, tab));
        this.el.appendChild(node);
      });
    }

    bindDnD() {
      this.el.addEventListener('dragstart', (e) => {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        tab.classList.add('dragging');
        e.dataTransfer.setData('text/plain', tab.dataset.tabId);
      });
      this.el.addEventListener('dragend', (e) => {
        const tab = e.target.closest('.tab');
        if (tab) tab.classList.remove('dragging');
      });
      this.el.addEventListener('dragover', (e) => e.preventDefault());
      this.el.addEventListener('drop', (e) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('text/plain');
        const target = e.target.closest('.tab');
        if (!target || !sourceId || sourceId === target.dataset.tabId) return;
        const sourceIdx = this.state.tabs.findIndex((t) => t.id === sourceId);
        const targetIdx = this.state.tabs.findIndex((t) => t.id === target.dataset.tabId);
        const [moved] = this.state.tabs.splice(sourceIdx, 1);
        this.state.tabs.splice(targetIdx, 0, moved);
        this.persist();
        this.render();
      });
    }
  }

  window.KynetraTabs = TabsManager;
})();
