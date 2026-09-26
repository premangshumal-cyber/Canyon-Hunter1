(() => {
  class BrowserEngine {
    constructor(app) {
      this.app = app;
      this.view = document.getElementById('browserView');
      this.internal = document.getElementById('internalView');
      this.addressBar = document.getElementById('addressBar');
      this.searchEngines = {
        google: 'https://www.google.com/search?q=',
        bing: 'https://www.bing.com/search?q=',
        duckduckgo: 'https://duckduckgo.com/?q=',
        yahoo: 'https://search.yahoo.com/search?p='
      };
      this.pendingTimeout = null;
      this.bindViewEvents();
    }

    bindViewEvents() {
      this.view.addEventListener('load', () => {
        const tab = this.app.tabs.current();
        if (!tab || tab.type !== 'web') return;
        tab.loading = false;
        tab.title = this.safeGetFrameTitle() || tab.url;
        this.addressBar.value = tab.url;
        this.app.history.add({ title: tab.title, url: tab.url }, tab.isPrivate);
        this.app.tabs.render();
      });

      this.view.addEventListener('error', () => this.renderErrorPage('connection'));
    }

    safeGetFrameTitle() {
      try {
        return this.view.contentDocument ? this.view.contentDocument.title : '';
      } catch {
        return '';
      }
    }

    normalizeInput(input) {
      const raw = input.trim();
      if (!raw) return null;
      const hasScheme = /^https?:\/\//i.test(raw);
      const looksLikeDomain = /^[\w.-]+\.[a-z]{2,}/i.test(raw);
      if (hasScheme || looksLikeDomain) {
        const url = hasScheme ? raw : `https://${raw}`;
        try {
          return { type: 'url', value: new URL(url).toString() };
        } catch {
          return { type: 'invalid', value: raw };
        }
      }
      return { type: 'search', value: raw };
    }

    toSearchUrl(query) {
      const engine = this.app.settings.get('search.engine') || 'google';
      const prefix = this.searchEngines[engine] || this.searchEngines.google;
      return `${prefix}${encodeURIComponent(query)}`;
    }

    navigate(input, opts = {}) {
      const tab = this.app.tabs.current();
      if (!tab) return;
      const parsed = this.normalizeInput(input);
      if (!parsed) return;
      if (parsed.type === 'invalid') {
        this.renderErrorPage('invalid', parsed.value);
        return;
      }
      const url = parsed.type === 'search' ? this.toSearchUrl(parsed.value) : parsed.value;
      tab.url = url;
      tab.type = 'web';
      tab.title = parsed.type === 'search' ? `Search: ${parsed.value}` : new URL(url).hostname;
      tab.loading = true;
      this.app.tabs.render();
      this.internal.classList.add('hidden');
      this.view.classList.remove('hidden');
      this.view.src = url;
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = setTimeout(() => {
        if (tab.loading) {
          tab.loading = false;
          this.app.tabs.render();
          this.renderErrorPage('blocked', url);
        }
      }, opts.timeout || 8000);
      this.app.tabs.pushHistory(url);
      this.app.tabs.persist();
    }

    openInternal(page, payload = {}) {
      this.view.classList.add('hidden');
      this.internal.classList.remove('hidden');
      this.internal.innerHTML = this.app.renderInternalPage(page, payload);
      this.app.afterInternalRender(page, payload);
    }

    renderErrorPage(type, data = '') {
      const map = {
        connection: {
          title: 'Unable to load this page.',
          desc: 'Check your connection and try again.',
          actions: `<button data-action="retry">Retry</button><button data-action="back">Back</button>`
        },
        invalid: {
          title: "Kynetra couldn't understand this address.",
          desc: 'Please check the URL and try again.',
          actions: `<button data-action="back">Go back</button>`
        },
        blocked: {
          title: "This site doesn't allow embedded viewing.",
          desc: 'Kynetra cannot bypass iframe security policies.',
          actions: `<button data-action="external" data-url="${data}">Open externally</button><button data-action="retry">Retry</button><button data-action="copy" data-url="${data}">Copy URL</button>`
        }
      };
      const cfg = map[type] || map.connection;
      this.openInternal('error', { type, ...cfg });
    }
  }

  window.KynetraBrowser = BrowserEngine;
})();
