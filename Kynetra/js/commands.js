(() => {
  class CommandsManager {
    constructor(app) {
      this.app = app;
      this.modal = document.getElementById('commandPalette');
      this.input = document.getElementById('commandInput');
      this.list = document.getElementById('commandList');
      this.index = 0;
      this.commands = [
        { label: 'New Tab', run: () => app.tabs.newTab() },
        { label: 'New Private Tab', run: () => app.tabs.newTab(true, 'internal:private') },
        { label: 'History', run: () => app.browser.openInternal('history') },
        { label: 'Downloads', run: () => app.toggleDownloads(true) },
        { label: 'Bookmarks', run: () => app.browser.openInternal('bookmarks') },
        { label: 'Settings', run: () => app.browser.openInternal('settings') },
        { label: 'Toggle Dark Mode', run: () => app.toggleTheme() }
      ];
      this.bind();
      this.render();
    }

    bind() {
      this.input.addEventListener('input', () => { this.index = 0; this.render(); });
      this.input.addEventListener('keydown', (e) => {
        const filtered = this.filtered();
        if (e.key === 'ArrowDown') { this.index = Math.min(filtered.length - 1, this.index + 1); this.render(); e.preventDefault(); }
        if (e.key === 'ArrowUp') { this.index = Math.max(0, this.index - 1); this.render(); e.preventDefault(); }
        if (e.key === 'Enter' && filtered[this.index]) { filtered[this.index].run(); this.close(); }
        if (e.key === 'Escape') this.close();
      });
    }

    filtered() {
      const q = this.input.value.trim().toLowerCase();
      return this.commands.filter((c) => c.label.toLowerCase().includes(q));
    }

    render() {
      const filtered = this.filtered();
      this.list.innerHTML = filtered.map((c, i) => `<li class="${i === this.index ? 'active' : ''}" data-i="${i}">${c.label}</li>`).join('');
      this.list.querySelectorAll('li').forEach((li) => li.addEventListener('click', () => {
        filtered[Number(li.dataset.i)].run();
        this.close();
      }));
    }

    open() {
      this.modal.classList.remove('hidden');
      this.input.value = '';
      this.index = 0;
      this.render();
      this.input.focus();
    }

    close() {
      this.modal.classList.add('hidden');
    }
  }

  window.KynetraCommands = CommandsManager;
})();
