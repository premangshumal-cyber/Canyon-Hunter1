(() => {
  class KynetraApp {
    constructor() {
      this.storage = window.KynetraStorage;
      this.history = new window.KynetraHistory(this.storage);
      this.bookmarks = new window.KynetraBookmarks(this.storage);
      this.downloads = new window.KynetraDownloads(this.storage);
      this.settings = new window.KynetraSettings(this.storage);
      this.tabs = new window.KynetraTabs(this.storage, this);
      this.browser = new window.KynetraBrowser(this);
      this.commands = new window.KynetraCommands(this);
      this.shortcuts = new window.KynetraShortcuts(this);
      this.zoomLevel = 1;
      this.bindUI();
      this.applyTheme();
      this.renderBookmarksBar();
      this.syncTabView();
      this.renderDownloads();
      this.toast('Kynetra ready');
      setInterval(() => this.refreshClock(), 1000);
    }

    bindUI() {
      const $ = (id) => document.getElementById(id);
      $('newTabBtn').addEventListener('click', () => this.tabs.newTab());
      $('privateBtn').addEventListener('click', () => this.tabs.newTab(true, 'internal:private'));
      $('backBtn').addEventListener('click', () => this.tabs.back());
      $('forwardBtn').addEventListener('click', () => this.tabs.forward());
      $('reloadBtn').addEventListener('click', () => this.reload());
      $('homeBtn').addEventListener('click', () => this.browser.openInternal('newtab'));
      $('downloadBtn').addEventListener('click', () => this.toggleDownloads());
      $('settingsBtn').addEventListener('click', () => this.browser.openInternal('settings'));
      $('bookmarkBtn').addEventListener('click', () => this.addBookmarkCurrent());
      $('addressForm').addEventListener('submit', (e) => { e.preventDefault(); this.browser.navigate($('addressBar').value); });
      $('findCloseBtn').addEventListener('click', () => this.toggleFind(false));
      $('findInput').addEventListener('input', () => this.findInPage($('findInput').value));
      $('findPrevBtn').addEventListener('click', () => this.findStep(-1));
      $('findNextBtn').addEventListener('click', () => this.findStep(1));
      $('commandPalette').addEventListener('click', (e) => { if (e.target.id === 'commandPalette') this.commands.close(); });

      document.addEventListener('click', () => document.getElementById('contextMenu').classList.add('hidden'));
      document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.tab')) return;
        e.preventDefault();
        this.showPageMenu(e);
      });

      document.addEventListener('kynetra-downloads-updated', () => this.renderDownloads());
      document.addEventListener('click', (e) => this.handleInternalActions(e));
    }

    syncTabView() {
      const tab = this.tabs.current();
      if (!tab) return;
      document.getElementById('addressBar').value = tab.url.startsWith('internal:') ? '' : tab.url;
      if (tab.type === 'internal') this.browser.openInternal(tab.url.replace('internal:', ''), { tab });
      else this.browser.navigate(tab.url, { timeout: 6000 });
    }

    reload() {
      const tab = this.tabs.current();
      if (!tab) return;
      if (tab.type === 'internal') this.syncTabView();
      else this.browser.navigate(tab.url, { timeout: 6000 });
    }

    renderInternalPage(page, payload = {}) {
      if (page === 'newtab') {
        return `
          <div class="center-page">
            <div>
              <img class="hero-logo" src="assets/logo.svg" alt="K" />
              <h1 style="letter-spacing:0.4em;margin:0;">KYNETRA</h1>
              <p style="color:var(--muted);margin:8px 0 14px;">Browse Beyond.</p>
              <form id="newTabSearch"><input style="width:min(640px,88vw);border:1px solid var(--border);border-radius:999px;padding:12px 16px;background:var(--card);" placeholder="Search or enter address..." /></form>
              <div class="quick-links">
                ${['Google|https://google.com','YouTube|https://youtube.com','GitHub|https://github.com','Wikipedia|https://wikipedia.org','Gmail|https://mail.google.com','Maps|https://maps.google.com'].map((s) => {
                  const [name, url] = s.split('|');
                  return `<button class="quick-link" data-url="${url}">${name}</button>`;
                }).join('')}
              </div>
              <div class="widget-grid">
                <div class="widget"><h4>Date & Time</h4><div id="clockWrap"></div></div>
                <div class="widget"><h4>Frequently visited</h4>${this.linkList(this.topVisited())}</div>
                <div class="widget"><h4>Bookmarks</h4>${this.linkList(this.bookmarks.allBookmarks().slice(0, 8))}</div>
                <div class="widget"><h4>Recent pages</h4>${this.linkList(this.history.items.slice(0, 8))}</div>
                <div class="widget"><h4>Theme</h4><button data-action="theme-dark">Dark</button> <button data-action="theme-light">Light</button> <button data-action="theme-system">System</button></div>
              </div>
            </div>
          </div>
        `;
      }

      if (page === 'private') {
        return `<div class="center-page"><div><h2>Private Browsing</h2><p style="color:var(--muted)">Kynetra won't save browsing history for this local private session simulation.</p></div></div>`;
      }

      if (page === 'history') return this.historyPage('');
      if (page === 'bookmarks') return this.bookmarksPage('');
      if (page === 'settings') return this.settingsPage('appearance');
      if (page === 'error') {
        return `<div class="center-page"><div><h2>Kynetra</h2><h3>${payload.title}</h3><p style="color:var(--muted)">${payload.desc}</p><div style="display:flex;gap:8px;justify-content:center">${payload.actions}</div></div></div>`;
      }
      return `<div class="center-page"><div>Unknown page.</div></div>`;
    }

    afterInternalRender(page) {
      this.refreshClock();
      if (page === 'newtab') {
        const form = document.getElementById('newTabSearch');
        if (form) {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.browser.navigate(form.querySelector('input').value);
          });
        }
        document.querySelectorAll('.quick-link').forEach((btn) => btn.addEventListener('click', () => this.browser.navigate(btn.dataset.url)));
      }

      if (page === 'history') {
        const search = document.getElementById('historySearch');
        search?.addEventListener('input', () => this.renderHistoryQuery(search.value));
      }

      if (page === 'bookmarks') {
        const search = document.getElementById('bookmarkSearch');
        search?.addEventListener('input', () => this.renderBookmarkQuery(search.value));
      }

      if (page === 'settings') {
        this.bindSettings();
      }
    }

    linkList(items) {
      if (!items.length) return '<small style="color:var(--muted)">No items yet.</small>';
      return `<ul>${items.map((i) => `<li data-url="${this.safeAttr(i.url || '')}">${this.escapeHTML((i.title || i.name || i.url || '').slice(0, 48))}</li>`).join('')}</ul>`;
    }

    topVisited() {
      const hits = {};
      this.history.items.forEach((i) => {
        hits[i.url] = hits[i.url] || { title: i.title, url: i.url, c: 0 };
        hits[i.url].c += 1;
      });
      return Object.values(hits).sort((a, b) => b.c - a.c).slice(0, 8);
    }

    historyPage(query) {
      const grouped = this.history.grouped(this.history.search(query));
      const section = (name, list) => `<h4>${name}</h4>${list.length ? `<ul>${list.map((i) => `<li><span data-url="${this.safeAttr(i.url)}">${this.escapeHTML(i.title)}</span> <small>${this.escapeHTML(new Date(i.timestamp).toLocaleString())}</small> <button data-action="history-delete" data-ts="${this.safeAttr(i.timestamp)}">Delete</button> <button data-action="copy-url" data-url="${this.safeAttr(i.url)}">Copy URL</button></li>`).join('')}</ul>` : '<small style="color:var(--muted)">No entries</small>'}`;
      return `<div><h2>History</h2><div style="display:flex;gap:8px"><input id="historySearch" placeholder="Search history" value="${this.safeAttr(query)}"/><button data-action="history-clear">Clear all history</button></div>${section('Today', grouped.today)}${section('Yesterday', grouped.yesterday)}${section('Previous 7 days', grouped.week)}${section('Older', grouped.older)}</div>`;
    }

    renderHistoryQuery(query) {
      document.getElementById('internalView').innerHTML = this.historyPage(query);
      this.afterInternalRender('history');
    }

    bookmarksPage(query) {
      const all = query ? this.bookmarks.search(query) : this.bookmarks.allBookmarks();
      return `<div><h2>Bookmarks</h2><div style="display:flex;gap:8px"><input id="bookmarkSearch" placeholder="Search bookmarks" value="${this.safeAttr(query)}"/><button data-action="bookmark-folder">New folder</button></div><ul>${all.map((b) => `<li><span data-url="${this.safeAttr(b.url)}">${this.escapeHTML(b.title)}</span> <button data-action="bookmark-edit" data-id="${this.safeAttr(b.id)}">Edit</button> <button data-action="bookmark-delete" data-id="${this.safeAttr(b.id)}">Delete</button></li>`).join('')}</ul></div>`;
    }

    renderBookmarkQuery(query) {
      document.getElementById('internalView').innerHTML = this.bookmarksPage(query);
      this.afterInternalRender('bookmarks');
    }

    settingsPage(active) {
      const sec = ['appearance', 'search', 'startup', 'privacy', 'downloads', 'browser'];
      const nav = sec.map((s) => `<button class="${active === s ? 'active' : ''}" data-action="settings-section" data-sec="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('');
      const content = {
        appearance: `<div class="settings-row"><label>Theme</label><select id="set-theme"><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></div><div class="settings-row"><label>Accent color</label><input id="set-accent" type="color" value="${this.settings.get('appearance.accent') || '#6366f1'}"></div><div class="settings-row"><label><input id="set-compact" type="checkbox" ${this.settings.get('appearance.compact') ? 'checked' : ''}/> Compact mode</label></div><div class="settings-row"><label><input id="set-rounded" type="checkbox" ${this.settings.get('appearance.rounded') ? 'checked' : ''}/> Rounded UI</label></div>`,
        search: `<div class="settings-row"><label>Default search engine</label><select id="set-engine"><option value="google">Google</option><option value="bing">Bing</option><option value="duckduckgo">DuckDuckGo</option><option value="yahoo">Yahoo</option></select></div><div class="settings-row"><label><input id="set-suggestions" type="checkbox" ${this.settings.get('search.suggestions') ? 'checked' : ''}/> Search suggestions</label></div>`,
        startup: `<div class="settings-row"><label>Startup mode</label><select id="set-startup"><option value="new-tab">New tab</option><option value="homepage">Custom homepage</option></select></div><div class="settings-row"><label>Custom homepage</label><input id="set-homepage" value="${this.settings.get('startup.homepage')}"></div>`,
        privacy: `<div class="settings-row"><button data-action="clear-history">Clear history</button></div><div class="settings-row"><button data-action="clear-bookmarks">Clear bookmarks</button></div><div class="settings-row"><button data-action="clear-site">Clear site data</button></div><div class="settings-row"><label>Tracking protection UI</label><select id="set-track"><option value="true">Enabled</option><option value="false">Disabled</option></select></div><div class="settings-row"><label>Cookie settings UI</label><select id="set-cookie"><option value="balanced">Balanced</option><option value="strict">Strict</option><option value="off">Off</option></select></div>`,
        downloads: `<div class="settings-row"><label><input id="set-dl-ask" type="checkbox" ${this.settings.get('downloads.askLocation') ? 'checked' : ''}/> Ask where to save downloads (UI)</label></div>`,
        browser: `<div class="settings-row"><label><input id="set-restore" type="checkbox" ${this.settings.get('browser.restoreSession') ? 'checked' : ''}/> Restore previous session</label></div><div class="settings-row"><label><input id="set-confirm" type="checkbox" ${this.settings.get('browser.confirmClose') ? 'checked' : ''}/> Confirm before closing</label></div><div class="settings-row"><label><input id="set-showbook" type="checkbox" ${this.settings.get('browser.showBookmarksBar') ? 'checked' : ''}/> Show bookmarks bar</label></div>`
      };

      return `<div class="settings-grid"><div class="settings-nav">${nav}</div><div class="settings-panel">${content[active]}</div></div>`;
    }

    bindSettings() {
      const apply = () => {
        const set = this.settings;
        const val = (id) => document.getElementById(id);
        if (val('set-theme')) set.update('appearance.themeMode', val('set-theme').value);
        if (val('set-accent')) set.update('appearance.accent', val('set-accent').value);
        if (val('set-compact')) set.update('appearance.compact', val('set-compact').checked);
        if (val('set-rounded')) set.update('appearance.rounded', val('set-rounded').checked);
        if (val('set-engine')) set.update('search.engine', val('set-engine').value);
        if (val('set-suggestions')) set.update('search.suggestions', val('set-suggestions').checked);
        if (val('set-startup')) set.update('startup.mode', val('set-startup').value);
        if (val('set-homepage')) set.update('startup.homepage', val('set-homepage').value);
        if (val('set-track')) set.update('privacy.trackingProtection', val('set-track').value === 'true');
        if (val('set-cookie')) set.update('privacy.cookieMode', val('set-cookie').value);
        if (val('set-dl-ask')) set.update('downloads.askLocation', val('set-dl-ask').checked);
        if (val('set-restore')) set.update('browser.restoreSession', val('set-restore').checked);
        if (val('set-confirm')) set.update('browser.confirmClose', val('set-confirm').checked);
        if (val('set-showbook')) set.update('browser.showBookmarksBar', val('set-showbook').checked);
        this.applyTheme();
        this.renderBookmarksBar();
        this.toast('Settings saved');
      };

      document.querySelectorAll('.settings-nav button').forEach((b) => b.addEventListener('click', () => {
        document.getElementById('internalView').innerHTML = this.settingsPage(b.dataset.sec);
        this.afterInternalRender('settings');
      }));

      document.querySelectorAll('.settings-panel input, .settings-panel select').forEach((el) => {
        el.addEventListener('change', apply);
      });
    }

    handleInternalActions(e) {
      const urlHolder = e.target.closest('[data-url]');
      if (urlHolder && !e.target.dataset.action) {
        const url = urlHolder.dataset.url;
        if (url) this.browser.navigate(url);
      }

      const action = e.target.dataset.action;
      if (!action) return;

      if (action === 'history-delete') {
        this.history.remove(e.target.dataset.ts);
        this.renderHistoryQuery(document.getElementById('historySearch')?.value || '');
      } else if (action === 'history-clear') {
        this.history.clear();
        this.renderHistoryQuery('');
        this.toast('History cleared');
      } else if (action === 'copy-url') {
        navigator.clipboard?.writeText(e.target.dataset.url || '');
        this.toast('URL copied');
      } else if (action === 'bookmark-delete') {
        this.bookmarks.remove(e.target.dataset.id);
        this.renderBookmarkQuery(document.getElementById('bookmarkSearch')?.value || '');
        this.renderBookmarksBar();
      } else if (action === 'bookmark-edit') {
        const title = prompt('Bookmark title');
        const url = prompt('Bookmark URL');
        if (title && url) this.bookmarks.editBookmark(e.target.dataset.id, { title, url });
        this.renderBookmarkQuery(document.getElementById('bookmarkSearch')?.value || '');
        this.renderBookmarksBar();
      } else if (action === 'bookmark-folder') {
        const name = prompt('Folder name');
        if (name) this.bookmarks.addFolder(name);
      } else if (action === 'clear-history') {
        this.settings.clearHistory();
        this.history.clear();
        this.toast('History cleared');
      } else if (action === 'clear-bookmarks') {
        this.settings.clearBookmarks();
        this.bookmarks.items = [];
        this.bookmarks.persist();
        this.renderBookmarksBar();
        this.toast('Bookmarks cleared');
      } else if (action === 'clear-site') {
        this.settings.clearSiteData();
        this.toast('Site data cleared');
      } else if (action === 'theme-dark') {
        this.settings.update('appearance.themeMode', 'dark');
        this.applyTheme();
      } else if (action === 'theme-light') {
        this.settings.update('appearance.themeMode', 'light');
        this.applyTheme();
      } else if (action === 'theme-system') {
        this.settings.update('appearance.themeMode', 'system');
        this.applyTheme();
      } else if (action === 'retry') {
        this.reload();
      } else if (action === 'back') {
        this.tabs.back();
      } else if (action === 'external') {
        const url = e.target.dataset.url || this.browser.lastBlockedUrl || '';
        if (url) window.open(url, '_blank', 'noopener');
      } else if (action === 'copy') {
        const url = e.target.dataset.url || this.browser.lastBlockedUrl || '';
        if (url) navigator.clipboard?.writeText(url);
        this.toast('URL copied');
      }
    }

    showTabMenu(e, tab) {
      e.preventDefault();
      this.showMenu(e.clientX, e.clientY, [
        ['New Tab', () => this.tabs.newTab()],
        ['Reload', () => this.reload()],
        ['Duplicate', () => this.tabs.duplicate(tab.id)],
        [tab.pinned ? 'Unpin Tab' : 'Pin Tab', () => this.tabs.togglePin(tab.id)],
        ['Close Tab', () => this.tabs.closeTab(tab.id)],
        ['Close Other Tabs', () => this.tabs.closeOthers(tab.id)],
        ['Reopen Closed Tab', () => this.tabs.reopenClosed()]
      ]);
    }

    showPageMenu(e) {
      this.showMenu(e.clientX, e.clientY, [
        ['Back', () => this.tabs.back()],
        ['Forward', () => this.tabs.forward()],
        ['Reload', () => this.reload()],
        ['Save Page', () => this.toast('Save page is browser-managed in web mode')],
        ['Print', () => window.print()],
        ['View Source', () => {
          const t = this.tabs.current();
          if (t?.url) window.open(`view-source:${t.url}`, '_blank', 'noopener');
        }],
        ['Inspect', () => this.toast('Use browser DevTools (F12)')]
      ]);
    }

    showMenu(x, y, items) {
      const menu = document.getElementById('contextMenu');
      menu.innerHTML = items.map((it, i) => `<button data-i="${i}">${it[0]}</button>`).join('');
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
      menu.classList.remove('hidden');
      menu.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
        items[Number(btn.dataset.i)][1]();
        menu.classList.add('hidden');
      }));
    }

    addBookmarkCurrent() {
      const tab = this.tabs.current();
      if (!tab?.url || tab.url.startsWith('internal:')) return this.toast('No page to bookmark');
      this.bookmarks.addBookmark(tab.title || tab.url, tab.url);
      this.renderBookmarksBar();
      this.toast('Bookmark added');
    }

    renderBookmarksBar() {
      const bar = document.getElementById('bookmarkBar');
      bar.innerHTML = '';
      const show = this.settings.get('browser.showBookmarksBar');
      bar.classList.toggle('hidden', !show);
      this.bookmarks.allBookmarks().slice(0, 20).forEach((b) => {
        const chip = document.createElement('button');
        chip.className = 'bookmark-chip';
        chip.textContent = b.title;
        chip.title = b.url;
        chip.addEventListener('click', () => this.browser.navigate(b.url));
        bar.appendChild(chip);
      });
    }

    toggleDownloads(force) {
      const panel = document.getElementById('downloadsPanel');
      if (typeof force === 'boolean') panel.classList.toggle('hidden', !force);
      else panel.classList.toggle('hidden');
      this.renderDownloads();
    }

    renderDownloads() {
      const panel = document.getElementById('downloadsPanel');
      panel.innerHTML = `<h3 style="margin:0 0 8px">Downloads</h3><button data-action="download-start">Start simulated download</button> <button data-action="download-clear">Clear downloads</button>`;
      this.downloads.items.forEach((d) => {
        const row = document.createElement('div');
        row.className = 'download-item';
        row.innerHTML = `<strong>${d.fileName}</strong><div class="progress"><span style="width:${d.progress}%"></span></div><small>${(d.progress / 100 * Number(d.sizeMb)).toFixed(1)} MB / ${d.sizeMb} MB</small><div>${d.status}</div><div style="display:flex;gap:6px;margin-top:6px"><button data-action="download-open" data-id="${d.id}">Open</button><button data-action="download-cancel" data-id="${d.id}">Cancel</button><button data-action="download-remove" data-id="${d.id}">Remove</button></div>`;
        panel.appendChild(row);
      });

      panel.querySelector('[data-action="download-start"]')?.addEventListener('click', () => {
        const tab = this.tabs.current();
        const url = tab?.url || 'https://example.com/file.bin';
        this.downloads.start(url);
        this.toast('Download started');
      });
      panel.querySelector('[data-action="download-clear"]')?.addEventListener('click', () => {
        this.downloads.clear();
        this.renderDownloads();
      });
      panel.querySelectorAll('[data-action="download-open"]').forEach((b) => b.addEventListener('click', () => this.toast('Opening is simulated in browser app UI')));
      panel.querySelectorAll('[data-action="download-cancel"]').forEach((b) => b.addEventListener('click', () => { this.downloads.cancel(b.dataset.id); this.renderDownloads(); }));
      panel.querySelectorAll('[data-action="download-remove"]').forEach((b) => b.addEventListener('click', () => { this.downloads.remove(b.dataset.id); this.renderDownloads(); }));
    }

    toggleTheme() {
      const current = this.settings.get('appearance.themeMode');
      const next = current === 'dark' ? 'light' : 'dark';
      this.settings.update('appearance.themeMode', next);
      this.applyTheme();
    }

    applyTheme() {
      const mode = this.settings.get('appearance.themeMode') || 'dark';
      const effective = mode === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : mode;
      document.documentElement.setAttribute('data-theme', effective);
      document.documentElement.style.setProperty('--accent', this.settings.get('appearance.accent') || '#6366f1');
      document.documentElement.style.setProperty('--radius', this.settings.get('appearance.rounded') ? '14px' : '4px');
      document.documentElement.style.setProperty('--radius-sm', this.settings.get('appearance.rounded') ? '10px' : '2px');
      document.body.style.fontSize = this.settings.get('appearance.compact') ? '14px' : '15px';
    }

    toggleFind(show) {
      document.getElementById('findBar').classList.toggle('hidden', !show);
      if (show) document.getElementById('findInput').focus();
    }

    findInPage(query) {
      const root = document.getElementById('internalView');
      const plain = root.textContent || '';
      const count = query ? (plain.toLowerCase().match(new RegExp(query.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length : 0;
      this.findMatches = { q: query, index: count ? 1 : 0, count };
      document.getElementById('findCount').textContent = `${this.findMatches.index} / ${count}`;
    }

    findStep(step) {
      if (!this.findMatches?.count) return;
      this.findMatches.index += step;
      if (this.findMatches.index < 1) this.findMatches.index = this.findMatches.count;
      if (this.findMatches.index > this.findMatches.count) this.findMatches.index = 1;
      document.getElementById('findCount').textContent = `${this.findMatches.index} / ${this.findMatches.count}`;
    }

    cycleTab(dir) {
      const tabs = this.tabs.state.tabs;
      const i = tabs.findIndex((t) => t.id === this.tabs.state.activeId);
      const next = (i + dir + tabs.length) % tabs.length;
      this.tabs.switchTab(tabs[next].id);
    }

    zoom(delta, reset = false) {
      this.zoomLevel = reset ? 1 : Math.max(0.5, Math.min(2, this.zoomLevel + delta));
      const root = document.getElementById('browserView').classList.contains('hidden') ? document.getElementById('internalView') : document.getElementById('browserView');
      root.style.transformOrigin = '0 0';
      root.style.transform = `scale(${this.zoomLevel})`;
      root.style.width = `${100 / this.zoomLevel}%`;
      root.style.height = `calc((100vh - 145px) / ${this.zoomLevel})`;
      this.toast(`Zoom ${Math.round(this.zoomLevel * 100)}%`);
    }

    refreshClock() {
      const node = document.getElementById('clockWrap');
      if (!node) return;
      const d = new Date();
      node.innerHTML = `<div>${d.toLocaleDateString()}</div><div style="font-size:1.5rem">${d.toLocaleTimeString()}</div>`;
    }

    toast(message) {
      const host = document.getElementById('toastHost');
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = message;
      host.appendChild(el);
      setTimeout(() => el.remove(), 2400);
    }

    escapeHTML(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    safeAttr(value) {
      return this.escapeHTML(value).replaceAll('`', '&#96;');
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.kynetra = new KynetraApp();
  });
})();
