// js/ui.js - Interfaz de usuario COMPLETA de ShareIt
// Versión: 2.0 - Con ajustes, preview, papelera funcional, notificaciones de subida

const UI = {
    // ========== ESTADO ==========
    currentUser: null,
    currentView: 'my-drive',
    currentFolder: null,
    selectedFiles: new Set(),
    filesCache: [],
    isSidebarOpen: true,
    _currentPreviewFile: null,
    _uploadStartTimes: {},
    _activeUploads: 0,

    // ========== INICIALIZACIÓN ==========
    async renderApp(user) {
        this.currentUser = user;
        
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('auth-container').style.display = 'none';
        
        const appContainer = document.getElementById('app-container');
        appContainer.style.display = 'flex';
        setTimeout(() => appContainer.classList.add('visible'), 50);
        
        await this.loadUserProfile();
        await StorageManager.initPuter();
        
        if (typeof ChatIA !== 'undefined') {
            ChatIA.init();
        }
        
        this.navigateTo('my-drive');
        this.checkSharedLink();
        
        console.log('✅ App renderizada para:', user.uid);
    },

    // ========== PERFIL ==========
    async loadUserProfile() {
        if (!this.currentUser) return;
        
        try {
            const profile = await Database.getUserProfile(this.currentUser.uid);
            if (!profile) return;
            
            const nameEl = document.getElementById('user-name');
            const planEl = document.getElementById('user-plan');
            const avatarEl = document.getElementById('user-avatar');
            
            if (nameEl) {
                nameEl.textContent = profile.displayName || 
                    this.currentUser.email?.split('@')[0] || 'Usuario';
            }
            
            if (planEl) {
                const plan = PLANS.getPlanById(profile.plan || 'PERSONAL_GRATUITO');
                planEl.textContent = plan?.name || 'Plan Gratuito';
            }
            
            const avatarUrl = profile.photoURL || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'User')}&background=6C5CE7&color=fff&size=80`;
            
            if (avatarEl) avatarEl.src = avatarUrl;
            
            this.updateStorageBar(profile);
            
            // Deshabilitar subida para anónimos
            const uploadBtn = document.getElementById('upload-btn');
            if (uploadBtn && profile.isAnonymous) {
                uploadBtn.disabled = true;
                uploadBtn.title = 'Usuarios anónimos no pueden subir archivos';
                uploadBtn.style.opacity = '0.5';
            }
        } catch (error) {
            console.error('Error cargando perfil:', error);
        }
    },

    updateStorageBar(profile) {
        const storageUsed = profile?.storageUsed || 0;
        const planId = profile?.plan || 'PERSONAL_GRATUITO';
        const maxStorage = PLANS.getStorageLimit(planId);
        const percentage = maxStorage > 0 ? Math.min(100, (storageUsed / maxStorage) * 100) : 0;
        
        const progressBar = document.getElementById('storage-progress');
        const storageText = document.getElementById('storage-text');
        
        if (progressBar) {
            progressBar.style.width = percentage + '%';
            progressBar.classList.remove('warning', 'danger');
            if (percentage > 90) progressBar.classList.add('danger');
            else if (percentage > 75) progressBar.classList.add('warning');
        }
        
        if (storageText) {
            storageText.textContent = `${Utils.formatBytes(storageUsed)} / ${Utils.formatBytes(maxStorage)} usado`;
        }
    },

    // ========== NAVEGACIÓN ==========
    async navigateTo(view, folderId = null) {
        this.currentView = view;
        this.currentFolder = folderId;
        this.selectedFiles.clear();
        this.updateToolbar();
        
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-view="${view}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        const titles = {
            'my-drive': 'Mi unidad',
            'shared': 'Compartidos conmigo',
            'recent': 'Recientes',
            'starred': 'Destacados',
            'trash': 'Papelera'
        };
        document.getElementById('current-view-title').textContent = titles[view] || 'Archivos';
        
        // Botones especiales de papelera
        const restoreBtn = document.getElementById('restore-btn');
        const deleteForeverBtn = document.getElementById('delete-forever-btn');
        if (restoreBtn) restoreBtn.style.display = view === 'trash' ? 'inline-flex' : 'none';
        if (deleteForeverBtn) deleteForeverBtn.style.display = view === 'trash' ? 'inline-flex' : 'none';
        
        this.showContentLoader(true);
        
        try {
            let files = [];
            
            if (folderId) {
                files = await Database.getFilesInFolder(this.currentUser.uid, folderId);
            } else if (view === 'shared') {
                files = await ShareManager.getSharedWithMe(this.currentUser.uid);
            } else {
                files = await Database.getFilesByView(this.currentUser.uid, view);
            }
            
            this.filesCache = files;
            this.renderFileList(files);
        } catch (error) {
            console.error('Error navegando:', error);
            this.showNotification('Error al cargar archivos', 'error');
            this.renderFileList([]);
        } finally {
            this.showContentLoader(false);
        }
    },

    // ========== RENDERIZADO ==========
    renderFileList(files) {
        const container = document.getElementById('file-list');
        const emptyState = document.getElementById('empty-state');
        
        if (!container) return;
        container.innerHTML = '';
        
        if (!files || files.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        files.forEach((file, index) => {
            const card = this.createFileCard(file, index);
            container.appendChild(card);
        });
    },

    createFileCard(file, index) {
        const card = document.createElement('div');
        card.className = 'file-card animate__animated animate__fadeInUp';
        card.style.animationDelay = `${index * 0.03}s`;
        card.dataset.fileId = file.id;
        
        if (this.selectedFiles.has(file.id)) {
            card.classList.add('selected');
        }
        
        const isFolder = file.type === 'folder';
        const iconClass = isFolder ? 'fa-solid fa-folder' : Utils.getFileIcon(file.name, file.type);
        const iconColor = isFolder ? '#FFD43B' : Utils.getFileColor(file.name, file.type);
        
        card.innerHTML = `
            <div class="file-icon">
                <i class="${iconClass}" style="color: ${iconColor}; font-size: 2rem;"></i>
            </div>
            ${file.starred ? '<div class="star-badge"><i class="fa-solid fa-star"></i></div>' : ''}
            <div class="file-name" title="${file.originalName || file.name}">${Utils.truncate(file.originalName || file.name, 25)}</div>
            <div class="file-meta">
                ${isFolder ? 'Carpeta' : Utils.formatBytes(file.size)} · ${Utils.formatDate(file.updatedAt || file.createdAt)}
            </div>
            <div class="file-actions">
                ${!isFolder ? `<button title="Vista previa" onclick="event.stopPropagation(); UI.previewFile('${file.id}')"><i class="fa-solid fa-eye"></i></button>` : ''}
                <button title="Compartir" onclick="event.stopPropagation(); UI.shareFileDialog('${file.id}')"><i class="fa-solid fa-share-nodes"></i></button>
                <button title="Destacar" onclick="event.stopPropagation(); UI.toggleStar('${file.id}')"><i class="fa-solid fa-star"></i></button>
                ${this.currentView === 'trash' ? `
                    <button title="Restaurar" onclick="event.stopPropagation(); UI.restoreFromTrash('${file.id}')"><i class="fa-solid fa-rotate-left"></i></button>
                    <button title="Eliminar para siempre" onclick="event.stopPropagation(); UI.deletePermanently('${file.id}')" style="color: var(--danger);"><i class="fa-solid fa-trash"></i></button>
                ` : `
                    <button title="Mover a papelera" onclick="event.stopPropagation(); UI.moveToTrash('${file.id}')"><i class="fa-solid fa-trash-can"></i></button>
                `}
            </div>
        `;
        
        // Click normal
        card.addEventListener('click', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                this.toggleFileSelection(file.id, card);
            } else if (isFolder && this.currentView !== 'trash') {
                this.navigateTo('my-drive', file.id);
            } else if (!isFolder) {
                this.previewFile(file.id);
            }
        });
        
        // Doble clic
        card.addEventListener('dblclick', (e) => {
            if (isFolder && this.currentView !== 'trash') {
                this.navigateTo('my-drive', file.id);
            } else if (!isFolder) {
                this.previewFile(file.id);
            }
        });
        
        // Click derecho
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY, file);
        });
        
        return card;
    },

    // ========== SELECCIÓN ==========
    toggleFileSelection(fileId, cardElement) {
        if (this.selectedFiles.has(fileId)) {
            this.selectedFiles.delete(fileId);
            if (cardElement) cardElement.classList.remove('selected');
        } else {
            this.selectedFiles.add(fileId);
            if (cardElement) cardElement.classList.add('selected');
        }
        this.updateToolbar();
    },

    updateToolbar() {
        const toolbar = document.getElementById('toolbar');
        const count = document.getElementById('selected-count');
        
        if (!toolbar) return;
        
        if (this.selectedFiles.size > 0) {
            toolbar.style.display = 'flex';
            if (count) count.textContent = `${this.selectedFiles.size} seleccionado(s)`;
        } else {
            toolbar.style.display = 'none';
        }
    },

    // ========== OPERACIONES CON ARCHIVOS ==========
    async handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        const user = this.currentUser;
        if (!user) return;
        
        const profile = await Database.getUserProfile(user.uid);
        if (profile?.isAnonymous) {
            this.showNotification('Los usuarios anónimos no pueden subir archivos', 'error');
            return;
        }
        
        // Mostrar panel de subidas
        this.showUploadPanel();
        this._activeUploads += files.length;
        this.updateUploadCount();
        
        for (const file of files) {
            const uploadId = Utils.generateId();
            this._uploadStartTimes[uploadId] = Date.now();
            
            const uploadItem = this.createUploadItem(uploadId, file);
            document.getElementById('upload-list').appendChild(uploadItem);
            
            try {
                const result = await StorageManager.uploadFile(user.uid, file, (progress) => {
                    this.updateUploadProgress(uploadId, progress, file);
                });
                
                this.completeUploadItem(uploadId, result);
                this.showNotification(`"${file.name}" subido correctamente`, 'success');
            } catch (error) {
                this.failUploadItem(uploadId, error.message);
                this.showNotification(`Error: ${error.message}`, 'error');
            } finally {
                this._activeUploads--;
                this.updateUploadCount();
            }
        }
        
        this.navigateTo(this.currentView, this.currentFolder);
        await this.loadUserProfile();
    },

    createUploadItem(uploadId, file) {
        const item = document.createElement('div');
        item.className = 'upload-item';
        item.id = `upload-${uploadId}`;
        item.innerHTML = `
            <div class="upload-item-icon">
                <i class="${Utils.getFileIcon(file.name, file.type)}" style="color: ${Utils.getFileColor(file.name, file.type)};"></i>
            </div>
            <div class="upload-item-info">
                <div class="upload-item-name">${Utils.truncate(file.name, 30)}</div>
                <div class="upload-item-status">Preparando...</div>
            </div>
            <div class="upload-item-progress">
                <svg class="progress-ring" width="36" height="36">
                    <circle class="progress-ring-circle-bg" cx="18" cy="18" r="15"></circle>
                    <circle class="progress-ring-circle" cx="18" cy="18" r="15" 
                        stroke-dasharray="94.25" stroke-dashoffset="94.25"></circle>
                </svg>
            </div>
            <div class="upload-item-actions">
                <button onclick="UI.cancelUpload('${uploadId}')" title="Cancelar">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;
        return item;
    },

    updateUploadProgress(uploadId, progress, file) {
        const item = document.getElementById(`upload-${uploadId}`);
        if (!item) return;
        
        const circle = item.querySelector('.progress-ring-circle');
        const status = item.querySelector('.upload-item-status');
        const circumference = 94.25;
        const offset = circumference - (progress / 100) * circumference;
        
        if (circle) {
            circle.style.strokeDashoffset = offset;
        }
        
        if (status) {
            const startTime = this._uploadStartTimes[uploadId] || Date.now();
            const elapsed = (Date.now() - startTime) / 1000;
            
            if (progress > 0 && progress < 100 && elapsed > 1) {
                const totalTime = (elapsed / progress) * 100;
                const remaining = totalTime - elapsed;
                
                if (remaining > 60) {
                    const mins = Math.ceil(remaining / 60);
                    status.textContent = `Subiendo... ${progress}% · Quedan ${mins} min`;
                } else if (remaining > 10) {
                    status.textContent = `Subiendo... ${progress}% · ${Math.ceil(remaining)}s restantes`;
                } else if (remaining > 0) {
                    status.textContent = `Subiendo... ${progress}% · Casi listo`;
                } else {
                    status.textContent = `Subiendo... ${progress}%`;
                }
            } else {
                status.textContent = `Subiendo... ${progress}%`;
            }
        }
        
        if (progress >= 100 && circle) {
            circle.style.stroke = '#51CF66';
        }
    },

    completeUploadItem(uploadId, fileData) {
        const item = document.getElementById(`upload-${uploadId}`);
        if (!item) return;
        
        const status = item.querySelector('.upload-item-status');
        if (status) {
            status.textContent = '✅ Completado';
            status.style.color = '#51CF66';
        }
        
        const circle = item.querySelector('.progress-ring-circle');
        if (circle) {
            circle.style.strokeDashoffset = '0';
            circle.style.stroke = '#51CF66';
        }
        
        // Auto-ocultar
        setTimeout(() => {
            if (item) {
                item.style.opacity = '0';
                item.style.transform = 'translateX(20px)';
                item.style.transition = 'all 0.4s ease';
                setTimeout(() => item.remove(), 400);
            }
        }, 3000);
        
        delete this._uploadStartTimes[uploadId];
    },

    failUploadItem(uploadId, errorMsg) {
        const item = document.getElementById(`upload-${uploadId}`);
        if (!item) return;
        
        const status = item.querySelector('.upload-item-status');
        if (status) {
            status.textContent = `❌ ${errorMsg}`;
            status.style.color = '#FF6B6B';
        }
        
        const circle = item.querySelector('.progress-ring-circle');
        if (circle) {
            circle.style.stroke = '#FF6B6B';
        }
        
        delete this._uploadStartTimes[uploadId];
    },

    cancelUpload(uploadId) {
        const item = document.getElementById(`upload-${uploadId}`);
        if (item) {
            item.style.opacity = '0';
            item.style.transition = 'all 0.3s ease';
            setTimeout(() => item.remove(), 300);
        }
        this._activeUploads = Math.max(0, this._activeUploads - 1);
        this.updateUploadCount();
        delete this._uploadStartTimes[uploadId];
        this.showNotification('Subida cancelada', 'warning');
    },

    updateUploadCount() {
        const countEl = document.querySelector('.upload-count');
        if (countEl) {
            countEl.textContent = this._activeUploads;
            countEl.style.display = this._activeUploads > 0 ? 'inline' : 'none';
        }
    },

    showUploadPanel() {
        const panel = document.getElementById('upload-panel');
        if (panel) {
            panel.style.display = 'block';
            panel.querySelector('.upload-list').style.display = 'block';
        }
    },

    toggleUploadPanel() {
        const panel = document.getElementById('upload-panel');
        const list = document.getElementById('upload-list');
        if (panel && list) {
            list.style.display = list.style.display === 'none' ? 'block' : 'none';
        }
    },

    async createFolder() {
        const folderName = prompt('📁 Nombre de la nueva carpeta:');
        if (!folderName || !folderName.trim()) return;
        
        try {
            await Database.createFolder(this.currentUser.uid, folderName.trim(), this.currentFolder);
            this.showNotification(`Carpeta "${folderName}" creada`, 'success');
            this.navigateTo(this.currentView, this.currentFolder);
        } catch (error) {
            this.showNotification('Error al crear carpeta', 'error');
        }
    },

    // ========== PAPELERA (CORREGIDO) ==========
    async moveToTrash(fileId) {
        const file = await Database.getFile(this.currentUser.uid, fileId);
        if (!file) return;
        
        const message = file.type === 'folder' 
            ? `¿Mover la carpeta "${file.name}" y su contenido a la papelera?`
            : `¿Mover "${file.originalName || file.name}" a la papelera?`;
        
        if (!confirm(message)) return;
        
        try {
            await Database.moveToTrash(this.currentUser.uid, fileId);
            this.showNotification('Movido a la papelera', 'success');
            this.navigateTo(this.currentView, this.currentFolder);
            await this.loadUserProfile();
        } catch (error) {
            this.showNotification('Error al mover a la papelera', 'error');
        }
    },

    async restoreFromTrash(fileId) {
        try {
            await Database.restoreFromTrash(this.currentUser.uid, fileId);
            this.showNotification('Archivo restaurado', 'success');
            this.navigateTo(this.currentView, this.currentFolder);
        } catch (error) {
            this.showNotification('Error al restaurar', 'error');
        }
    },

    async deletePermanently(fileId) {
        const file = await Database.getFile(this.currentUser.uid, fileId);
        if (!file) return;
        
        if (!confirm(`⚠️ ¿Eliminar "${file.originalName || file.name}" PARA SIEMPRE?\n\nEsta acción NO se puede deshacer.`)) return;
        
        try {
            await StorageManager.deleteFilePermanently(this.currentUser.uid, file);
            this.showNotification('Archivo eliminado permanentemente', 'success');
            this.navigateTo(this.currentView, this.currentFolder);
            await this.loadUserProfile();
        } catch (error) {
            this.showNotification('Error al eliminar', 'error');
        }
    },

    // ========== ACCIONES EN LOTE ==========
    async moveToTrashSelected() {
        if (this.selectedFiles.size === 0) return;
        if (!confirm(`¿Mover ${this.selectedFiles.size} archivo(s) a la papelera?`)) return;
        
        for (const fileId of this.selectedFiles) {
            await Database.moveToTrash(this.currentUser.uid, fileId);
        }
        
        this.selectedFiles.clear();
        this.updateToolbar();
        this.navigateTo(this.currentView, this.currentFolder);
        this.showNotification('Archivos movidos a la papelera', 'success');
    },

    async restoreSelected() {
        if (this.selectedFiles.size === 0) return;
        
        for (const fileId of this.selectedFiles) {
            await Database.restoreFromTrash(this.currentUser.uid, fileId);
        }
        
        this.selectedFiles.clear();
        this.updateToolbar();
        this.navigateTo(this.currentView, this.currentFolder);
        this.showNotification('Archivos restaurados', 'success');
    },

    async deletePermanentlySelected() {
        if (this.selectedFiles.size === 0) return;
        if (!confirm(`⚠️ ¿Eliminar ${this.selectedFiles.size} archivo(s) PARA SIEMPRE?`)) return;
        
        for (const fileId of this.selectedFiles) {
            const file = await Database.getFile(this.currentUser.uid, fileId);
            if (file) {
                await StorageManager.deleteFilePermanently(this.currentUser.uid, file);
            }
        }
        
        this.selectedFiles.clear();
        this.updateToolbar();
        this.navigateTo(this.currentView, this.currentFolder);
    },

    async downloadSelected() {
        for (const fileId of this.selectedFiles) {
            const file = await Database.getFile(this.currentUser.uid, fileId);
            if (file && file.type !== 'folder') {
                await StorageManager.downloadFile(file);
            }
        }
    },

    async shareSelected() {
        if (this.selectedFiles.size === 0) return;
        if (this.selectedFiles.size === 1) {
            const fileId = this.selectedFiles.values().next().value;
            this.shareFileDialog(fileId);
        } else {
            this.showNotification('Selecciona un solo archivo para compartir', 'warning');
        }
    },

    // ========== PREVIEW (CORREGIDO) ==========
    async previewFile(fileId) {
        const file = await Database.getFile(this.currentUser.uid, fileId);
        if (!file) return;
        
        if (file.type === 'folder') {
            this.navigateTo('my-drive', file.id);
            return;
        }
        
        const overlay = document.getElementById('file-preview-overlay');
        const body = document.getElementById('file-preview-body');
        const nameEl = document.getElementById('file-preview-name');
        
        if (!overlay || !body || !nameEl) return;
        
        nameEl.textContent = file.originalName || file.name;
        this._currentPreviewFile = file;
        
        body.innerHTML = '<div class="content-loader"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p class="mt-10">Cargando vista previa...</p></div>';
        overlay.style.display = 'flex';
        
        try {
            const url = await StorageManager.getFileUrl(file);
            
            if (!url) {
                body.innerHTML = this._getUnsupportedPreviewHTML(file);
                return;
            }
            
            const mimeType = file.type || '';
            const ext = Utils.getFileExtension(file.name);
            
            // Imagen
            if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
                body.innerHTML = `<img src="${url}" alt="${file.name}" onerror="this.parentElement.innerHTML=UI._getUnsupportedPreviewHTML(UI._currentPreviewFile)">`;
            }
            // Video
            else if (mimeType.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) {
                body.innerHTML = `
                    <video controls autoplay style="max-width: 100%; max-height: 75vh;">
                        <source src="${url}" type="${mimeType || 'video/mp4'}">
                        Tu navegador no soporta video.
                    </video>`;
            }
            // Audio
            else if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
                body.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i class="fa-solid fa-music fa-4x mb-20" style="color: #FFD43B;"></i>
                        <p style="font-size: 1.2rem; margin-bottom: 16px;">${file.originalName || file.name}</p>
                        <audio controls style="width: 100%; max-width: 500px;">
                            <source src="${url}" type="${mimeType || 'audio/mpeg'}">
                        </audio>
                    </div>`;
            }
            // PDF
            else if (mimeType === 'application/pdf' || ext === 'pdf') {
                body.innerHTML = `<iframe src="${url}" style="width: 100%; height: 75vh; border: none; background: white;"></iframe>`;
            }
            // Texto plano
            else if (mimeType.startsWith('text/') || ['txt', 'csv', 'log', 'md'].includes(ext)) {
                if (url.startsWith('data:')) {
                    try {
                        const base64 = url.split(',')[1];
                        const text = atob(base64);
                        body.innerHTML = `<pre>${this.escapeHtml(text)}</pre>`;
                    } catch (e) {
                        body.innerHTML = `<iframe src="${url}" style="width: 100%; height: 75vh; border: none; background: white;"></iframe>`;
                    }
                } else {
                    body.innerHTML = `<iframe src="${url}" style="width: 100%; height: 75vh; border: none; background: white;"></iframe>`;
                }
            }
            // Código
            else if (['html', 'htm', 'css', 'js', 'json', 'xml', 'py', 'java', 'cpp', 'php', 'sql'].includes(ext)) {
                if (ext === 'html' || ext === 'htm') {
                    if (url.startsWith('data:')) {
                        const base64 = url.split(',')[1];
                        const html = atob(base64);
                        body.innerHTML = `<iframe srcdoc="${this.escapeAttr(html)}" style="width: 100%; height: 75vh; border: none; background: white;"></iframe>`;
                    } else {
                        body.innerHTML = `<iframe src="${url}" style="width: 100%; height: 75vh; border: none; background: white;"></iframe>`;
                    }
                } else if (url.startsWith('data:')) {
                    try {
                        const base64 = url.split(',')[1];
                        const code = atob(base64);
                        body.innerHTML = `<pre>${this.escapeHtml(code)}</pre>`;
                    } catch (e) {
                        body.innerHTML = this._getUnsupportedPreviewHTML(file);
                    }
                } else {
                    body.innerHTML = `<iframe src="${url}" style="width: 100%; height: 75vh; border: none; background: white;"></iframe>`;
                }
            }
            // Otros
            else {
                body.innerHTML = this._getUnsupportedPreviewHTML(file);
            }
        } catch (error) {
            console.error('Error en preview:', error);
            body.innerHTML = this._getUnsupportedPreviewHTML(file, error.message);
        }
    },

    _getUnsupportedPreviewHTML(file, errorMsg = null) {
        const iconClass = Utils.getFileIcon(file.name, file.type);
        const iconColor = Utils.getFileColor(file.name, file.type);
        
        return `
            <div class="unsupported">
                <i class="${iconClass} fa-4x mb-10" style="color: ${iconColor}; display: block;"></i>
                <p style="font-size: 1.1rem; font-weight: 500;">${file.originalName || file.name}</p>
                <p class="text-secondary">${Utils.formatBytes(file.size)} · ${file.type || 'Tipo desconocido'}</p>
                ${errorMsg ? `<p class="text-danger mt-10">Error: ${errorMsg}</p>` : ''}
                <div style="display: flex; gap: 8px; justify-content: center; margin-top: 20px;">
                    <button class="btn btn-primary" onclick="StorageManager.downloadFile(UI._currentPreviewFile)">
                        <i class="fa-solid fa-download"></i> Descargar
                    </button>
                    <button class="btn btn-outline" onclick="UI.closeFilePreview()">
                        <i class="fa-solid fa-times"></i> Cerrar
                    </button>
                </div>
            </div>
        `;
    },

    closeFilePreview() {
        const overlay = document.getElementById('file-preview-overlay');
        if (overlay) overlay.style.display = 'none';
        this._currentPreviewFile = null;
    },

    downloadCurrentPreview() {
        if (this._currentPreviewFile) {
            StorageManager.downloadFile(this._currentPreviewFile);
        }
    },

    // ========== COMPARTIR ==========
    async shareFileDialog(fileId) {
        const file = await Database.getFile(this.currentUser.uid, fileId);
        if (!file) return;
        
        try {
            const result = await ShareManager.createShareLink(this.currentUser.uid, fileId);
            
            this.showModal(`
                <h2><i class="fa-solid fa-share-nodes"></i> Compartir</h2>
                <p class="text-secondary mb-10">${Utils.truncate(file.originalName || file.name, 40)}</p>
                <div style="margin: 16px 0;">
                    <label class="text-secondary" style="font-size: 0.85rem;">Link de acceso:</label>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <input type="text" value="${result.link}" readonly class="input-field" id="share-link-input" style="flex: 1;">
                        <button class="btn btn-primary btn-sm" onclick="ShareManager.copyToClipboard('${result.link}')">
                            <i class="fa-solid fa-copy"></i> Copiar
                        </button>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-outline btn-sm" onclick="ShareManager.shareByEmail('${result.link}', prompt('Email del destinatario:')); UI.closeModal();">
                        <i class="fa-solid fa-envelope"></i> Email
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="window.open('${ShareManager.generateQRCode(result.link)}', '_blank')">
                        <i class="fa-solid fa-qrcode"></i> QR
                    </button>
                </div>
            `);
        } catch (error) {
            this.showNotification('Error al compartir', 'error');
        }
    },

    // ========== ESTRELLAS ==========
    async toggleStar(fileId) {
        const file = await Database.getFile(this.currentUser.uid, fileId);
        if (!file) return;
        
        await Database.updateFile(this.currentUser.uid, fileId, { starred: !file.starred });
        this.navigateTo(this.currentView, this.currentFolder);
    },

    // ========== BÚSQUEDA ==========
    async searchFiles() {
        const query = document.getElementById('search-input')?.value.trim();
        
        if (!query) {
            this.navigateTo(this.currentView, this.currentFolder);
            return;
        }
        
        this.showContentLoader(true);
        
        try {
            const results = await Database.searchFiles(this.currentUser.uid, query);
            this.renderFileList(results);
            document.getElementById('current-view-title').textContent = `Resultados para: "${query}"`;
        } catch (error) {
            this.showNotification('Error en búsqueda', 'error');
        } finally {
            this.showContentLoader(false);
        }
    },

    // ========== AJUSTES ==========
    showSettingsTab() {
        const panel = document.getElementById('settings-panel');
        if (!panel) return;
        
        panel.style.display = 'block';
        this.loadSettingsData();
    },

    closeSettingsTab() {
        const panel = document.getElementById('settings-panel');
        if (panel) panel.style.display = 'none';
    },

    async loadSettingsData() {
        const user = this.currentUser;
        if (!user) return;
        
        try {
            const profile = await Database.getUserProfile(user.uid);
            if (!profile) return;
            
            const usernameEl = document.getElementById('settings-username');
            const emailEl = document.getElementById('settings-email');
            const avatarEl = document.getElementById('settings-avatar');
            
            if (usernameEl) usernameEl.value = profile.displayName || '';
            if (emailEl) emailEl.value = profile.email || user.email || '';
            if (avatarEl) {
                avatarEl.src = profile.photoURL || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'User')}&background=6C5CE7&color=fff&size=160`;
            }
        } catch (error) {
            console.error('Error cargando ajustes:', error);
        }
    },

    async saveSettings() {
        const usernameEl = document.getElementById('settings-username');
        const username = usernameEl?.value?.trim();
        
        if (!username) {
            this.showNotification('El nombre no puede estar vacío', 'error');
            return;
        }
        
        try {
            await Database.updateUserProfile(this.currentUser.uid, { displayName: username });
            
            if (this.currentUser.updateProfile) {
                await this.currentUser.updateProfile({ displayName: username });
            }
            
            this.showNotification('Perfil actualizado', 'success');
            this.closeSettingsTab();
            await this.loadUserProfile();
        } catch (error) {
            this.showNotification('Error: ' + error.message, 'error');
        }
    },

    async changeAvatar() {
        const url = prompt('📸 Pega la URL de tu nueva foto de perfil:\n\n(La imagen debe estar alojada en internet)');
        if (!url) return;
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            this.showNotification('URL inválida', 'error');
            return;
        }
        
        try {
            await Database.updateUserProfile(this.currentUser.uid, { photoURL: url });
            
            if (this.currentUser.updateProfile) {
                await this.currentUser.updateProfile({ photoURL: url });
            }
            
            this.showNotification('Foto actualizada', 'success');
            await this.loadUserProfile();
            this.loadSettingsData();
        } catch (error) {
            this.showNotification('Error: ' + error.message, 'error');
        }
    },

    async deleteAccount() {
        const input = prompt(
            '⚠️ ¿ELIMINAR tu cuenta para siempre?\n\n' +
            '• Se borrarán TODOS tus archivos\n' +
            '• Se eliminará tu perfil\n' +
            '• NO se puede deshacer\n\n' +
            'Escribe "ELIMINAR" para confirmar:'
        );
        
        if (input !== 'ELIMINAR') {
            this.showNotification('Eliminación cancelada', 'info');
            return;
        }
        
        try {
            const files = await Database.getAllUserFiles(this.currentUser.uid);
            for (const file of files) {
                await StorageManager.deleteFilePermanently(this.currentUser.uid, file);
            }
            
            await Database.getUserRef(this.currentUser.uid).remove();
            await this.currentUser.delete();
            
            this.showNotification('Cuenta eliminada', 'success');
            this.closeSettingsTab();
            await Auth.signOut();
        } catch (error) {
            this.showNotification('Error: ' + error.message, 'error');
        }
    },

    // ========== PLANES ==========
    showPlansModal() {
        const allPlans = [
            { category: '👤 Personal', plans: [PLANS.PERSONAL.GRATUITO, PLANS.PERSONAL.PLUS, PLANS.PERSONAL.PRO] },
            { category: '🏢 Empresa', plans: [PLANS.EMPRESA.GRATUITO, PLANS.EMPRESA.BUSINESS_PRO, PLANS.EMPRESA.BUSINESS_INFINITY] }
        ];
        
        let html = '';
        
        allPlans.forEach(group => {
            html += `<h3 style="margin: 16px 0 12px; color: var(--text-secondary);">${group.category}</h3>`;
            html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">';
            
            group.plans.forEach(plan => {
                const price = plan.price?.formatted || 'Gratuito';
                const badge = plan.badge ? `<span class="badge" style="background: ${plan.color}20; color: ${plan.color};">${plan.badge}</span>` : '';
                const isCurrentPlan = this.currentUser?.plan === plan.id;
                
                html += `
                    <div class="plan-card ${isCurrentPlan ? 'featured' : ''}" style="padding: 20px; border: 1px solid var(--glass-border); border-radius: var(--radius); text-align: center; position: relative;">
                        ${badge ? `<div style="position: absolute; top: -8px; right: -8px;">${badge}</div>` : ''}
                        <div style="font-size: 2rem; margin-bottom: 8px;">
                            <i class="${plan.icon}" style="color: ${plan.color};"></i>
                        </div>
                        <h4 style="color: ${plan.color};">${plan.name}</h4>
                        <p style="font-size: 1.4rem; font-weight: 700; margin: 8px 0;">${price}</p>
                        <p style="color: var(--text-secondary); font-size: 0.85rem;">${plan.storageFormatted}</p>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">${plan.ia?.name || ''}</p>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">${plan.ia?.credits || 0} créditos</p>
                        <button class="btn ${isCurrentPlan ? 'btn-secondary' : 'btn-outline'} btn-sm mt-10" 
                            ${isCurrentPlan ? 'disabled' : ''}
                            onclick="UI.showNotification('Sistema de pagos próximamente', 'info')">
                            ${isCurrentPlan ? '✓ Plan actual' : 'Mejorar'}
                        </button>
                    </div>
                `;
            });
            
            html += '</div>';
        });
        
        this.showModal(`
            <h2><i class="fa-solid fa-crown"></i> Planes ShareIt</h2>
            <div style="max-height: 60vh; overflow-y: auto; padding-right: 8px;">
                ${html}
            </div>
            <p class="text-muted mt-20" style="text-align: center; font-size: 0.8rem;">
                * Precios con IVA incluido. Pagos próximamente disponibles.
            </p>
        `);
    },

    // ========== MODAL ==========
    showModal(content) {
        const overlay = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');
        
        if (overlay && modalContent) {
            modalContent.innerHTML = content;
            overlay.style.display = 'flex';
        }
    },

    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.style.display = 'none';
    },

    // ========== NOTIFICACIONES ==========
    showNotification(message, type = 'success') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-exclamation',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };
        
        const notification = document.createElement('div');
        notification.className = `notification ${type} animate__animated animate__fadeInRight`;
        notification.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        // Auto-eliminar
        setTimeout(() => {
            notification.style.animation = 'fadeOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    },

    // ========== UTILIDADES ==========
    showLoading(show) {
        const loader = document.getElementById('loading-screen');
        if (loader) loader.style.display = show ? 'flex' : 'none';
    },

    showContentLoader(show) {
        const loader = document.getElementById('content-loader');
        const fileList = document.getElementById('file-list');
        const emptyState = document.getElementById('empty-state');
        
        if (loader) loader.style.display = show ? 'block' : 'none';
        if (show) {
            if (fileList) fileList.innerHTML = '';
            if (emptyState) emptyState.style.display = 'none';
        }
    },

    showEmailAuthForm() {
        const section = document.getElementById('email-auth-section');
        if (section) {
            const isVisible = section.style.display !== 'none';
            section.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                document.getElementById('auth-email')?.focus();
            }
        }
    },

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            this.isSidebarOpen = !this.isSidebarOpen;
            sidebar.classList.toggle('open', this.isSidebarOpen);
        }
    },

    toggleIAPanel() {
        const panel = document.getElementById('ia-panel');
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) {
                setTimeout(() => document.getElementById('ia-input')?.focus(), 100);
            }
        }
    },

    async checkSharedLink() {
        const params = new URLSearchParams(window.location.search);
        const sharedId = params.get('shared');
        
        if (sharedId) {
            const file = await ShareManager.getSharedFile(sharedId);
            if (file) {
                this.showNotification('Archivo compartido cargado', 'info');
                this.previewFile(file.id);
            }
        }
    },

    showContextMenu(x, y, file) {
        const existing = document.querySelector('.context-menu');
        if (existing) existing.remove();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu glass';
        menu.style.cssText = `position: fixed; left: ${Math.min(x, window.innerWidth - 220)}px; top: ${Math.min(y, window.innerHeight - 300)}px;`;
        
        const isTrash = this.currentView === 'trash';
        
        menu.innerHTML = `
            ${!isTrash ? `
                <button class="nav-btn" onclick="UI.previewFile('${file.id}'); this.closest('.context-menu').remove();">
                    <i class="fa-solid fa-eye"></i> Vista previa
                </button>
                <button class="nav-btn" onclick="UI.shareFileDialog('${file.id}'); this.closest('.context-menu').remove();">
                    <i class="fa-solid fa-share"></i> Compartir
                </button>
                <button class="nav-btn" onclick="UI.toggleStar('${file.id}'); this.closest('.context-menu').remove();">
                    <i class="fa-solid fa-star"></i> ${file.starred ? 'Quitar destacado' : 'Destacar'}
                </button>
                ${file.type !== 'folder' ? `
                    <button class="nav-btn" onclick="StorageManager.downloadFile(UI.filesCache.find(f => f.id === '${file.id}')); this.closest('.context-menu').remove();">
                        <i class="fa-solid fa-download"></i> Descargar
                    </button>
                ` : ''}
                <hr>
                <button class="nav-btn" style="color: var(--danger);" onclick="UI.moveToTrash('${file.id}'); this.closest('.context-menu').remove();">
                    <i class="fa-solid fa-trash-can"></i> Mover a papelera
                </button>
            ` : `
                <button class="nav-btn" onclick="UI.restoreFromTrash('${file.id}'); this.closest('.context-menu').remove();">
                    <i class="fa-solid fa-rotate-left"></i> Restaurar
                </button>
                <hr>
                <button class="nav-btn" style="color: var(--danger);" onclick="UI.deletePermanently('${file.id}'); this.closest('.context-menu').remove();">
                    <i class="fa-solid fa-delete-left"></i> Eliminar para siempre
                </button>
            `}
        `;
        
        document.body.appendChild(menu);
        
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 100);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    escapeAttr(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
};

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('modal-overlay');
    if (overlay && e.target === overlay) {
        UI.closeModal();
    }
    
    const previewOverlay = document.getElementById('file-preview-overlay');
    if (previewOverlay && e.target === previewOverlay) {
        UI.closeFilePreview();
    }
});

// Atajos de teclado
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key === 'Escape') {
        UI.closeModal();
        UI.closeFilePreview();
    }
});

console.log('🎨 UI completamente cargada y funcional');
