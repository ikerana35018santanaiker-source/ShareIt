// js/ui.js
const UI = {
    currentUser: null,
    currentFolder: 'root',
    currentView: 'root', // 'root', 'shared', 'trash', 'backups'
    filesCache: [],

    renderApp(user, userData) {
        this.currentUser = user;
        document.getElementById('auth-container').style.display = 'none';
        const appContainer = document.getElementById('app-container');
        appContainer.style.display = 'flex';
        setTimeout(() => appContainer.classList.add('visible'), 10);

        document.getElementById('user-name').textContent = user.email || user.displayName || 'Anónimo';
        this.updateStorageIndicator(userData);
        this.navigateTo('root');
        StorageManager.initPuter();
    },

    async navigateTo(view) {
        this.currentView = view;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[onclick="UI.navigateTo('${view}')"]`)?.classList.add('active');

        const titles = { root: 'Mi unidad', shared: 'Compartidos conmigo', trash: 'Papelera', backups: 'Copias de seguridad' };
        document.getElementById('current-view-title').textContent = titles[view];

        const files = await Database.getAllUserFiles(this.currentUser.uid);
        this.filesCache = files;
        this.renderFileList(files, view);
    },

    renderFileList(files, view) {
        const container = document.getElementById('file-list');
        container.innerHTML = '';

        let filtered = [];
        if (view === 'root') filtered = files.filter(f => !f.inTrash && f.parentFolder === this.currentFolder);
        else if (view === 'trash') filtered = files.filter(f => f.inTrash);
        else if (view === 'shared') filtered = []; // Se llenará con consulta a shared_links

        filtered.forEach(file => {
            const card = document.createElement('div');
            card.className = 'file-card animate__animated animate__fadeInUp';
            card.innerHTML = `
                <div class="file-icon">${file.type === 'folder' ? '📁' : Utils.getFileIcon(file.name)}</div>
                <div class="file-name">${file.name}</div>
                <div class="file-size">${file.size ? Utils.formatBytes(file.size) : ''}</div>
                <div class="file-actions">
                    <button onclick="UI.shareFile('${file.id}')">🔗</button>
                    <button onclick="UI.moveToTrash('${file.id}')">🗑️</button>
                </div>
            `;
            card.addEventListener('click', () => {
                if (file.type === 'folder') {
                    this.currentFolder = file.id;
                    this.navigateTo('root');
                } else {
                    this.previewFile(file);
                }
            });
            container.appendChild(card);
        });
    },

    async shareFile(fileId) {
        const link = await ShareManager.createShareLink(this.currentUser.uid, fileId);
        prompt('Link para compartir:', link);
    },

    async moveToTrash(fileId) {
        await Database.moveToTrash(this.currentUser.uid, fileId);
        this.navigateTo(this.currentView);
    },

    async previewFile(file) {
        const url = await StorageManager.getFileUrl(file);
        if (url) {
            window.open(url, '_blank');
        } else {
            alert('No se pudo previsualizar el archivo.');
        }
    },

    async handleFileUpload(files) {
        if (!files.length) return;
        const file = files[0];
        try {
            await StorageManager.uploadFile(this.currentUser.uid, file);
            this.navigateTo(this.currentView);
        } catch (e) {
            alert('Error al subir: ' + e.message);
        }
    },

    toggleIAPanel() {
        const panel = document.getElementById('ia-panel');
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    },

    async sendIAPrompt() {
        const input = document.getElementById('ia-prompt');
        const prompt = input.value.trim();
        if (!prompt) return;
        // Usar Puter.js para IA
        try {
            const response = await puter.ai.chat(prompt);
            const chatContainer = document.getElementById('ia-chat');
            chatContainer.innerHTML += `<div class="msg user">🧑 ${prompt}</div>`;
            chatContainer.innerHTML += `<div class="msg ia">🤖 ${response.message || response}</div>`;
            input.value = '';
            chatContainer.scrollTop = chatContainer.scrollHeight;
        } catch (e) {
            alert('IA no disponible en este momento.');
        }
    },

    updateStorageIndicator(userData) {
        // Lógica de espacio según plan
        document.getElementById('storage-text').textContent = '0 GB / 15 GB';
    }
};
