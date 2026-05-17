// js/ui.js
const UI = {
    currentUser: null,
    currentFolder: 'root', // Para navegar entre carpetas

    renderAuthForms() {
        // Ocultar app, mostrar contenedor de auth
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('auth-container').style.display = 'block';
        // Aquí cargaría dinámicamente los formularios para Google, Email, Anónimo, Link Mágico...
        console.log("Mostrando UI de autenticación");
    },

    async renderApp(user, userData) {
        this.currentUser = user;
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';

        // Mostrar barra lateral (carpetas, papelera, compartidos)
        this.renderSidebar(userData);

        // Cargar y mostrar archivos de la carpeta actual
        const files = await StorageManager.getUserFiles(user.uid);
        this.renderFileList(files);

        // Aplicar lógica de UI: si es anónimo, deshabilitar botón de subida
        if (userData && userData.isAnonymous) {
            document.getElementById('upload-btn').disabled = true;
            document.getElementById('upload-btn').title = "Los usuarios anónimos no pueden subir archivos";
        }
    },

    renderFileList(files) {
        const fileListContainer = document.getElementById('file-list');
        fileListContainer.innerHTML = ''; // Limpiar

        // Filtrar archivos que no están en papelera y están en la carpeta actual
        const activeFiles = files.filter(f => !f.inTrash && f.parentFolder === this.currentFolder);

        activeFiles.forEach(file => {
            const fileElement = document.createElement('div');
            fileElement.className = 'file-item animate__animated animate__fadeIn'; // Animación suave
            fileElement.innerHTML = `
                <span class="file-icon">📄</span>
                <span class="file-name">${file.name}</span>
                <span class="file-size">${Utils.formatBytes(file.size)}</span>
                <button onclick="UI.shareFile('${file.id}')">🔗 Compartir</button>
                <button onclick="UI.deleteFile('${file.id}')">🗑️ Mover a Papelera</button>
            `;
            fileListContainer.appendChild(fileElement);
        });
    },

    renderSidebar(userData) {
        // Renderizar secciones: Mi Unidad, Compartidos Conmigo, Papelera, etc.
        console.log("Renderizando barra lateral con uso de almacenamiento...");
        // Aquí se calcularía el espacio usado vs el límite del plan
    },

    // Funciones para papelera, compartir, etc.
    async deleteFile(fileId) {
        if (!confirm('¿Mover archivo a la papelera?')) return;
        await database.ref(`files/${this.currentUser.uid}/${fileId}`).update({ inTrash: true });
        this.renderApp(this.currentUser, null); // Recargar vista
        alert('Archivo movido a la papelera.');
    },

    async shareFile(fileId) {
        // Lógica para generar un link único y aleatorio (no siempre el mismo)
        const shareId = 'link_' + Utils.generateId();
        const shareData = {
            shareId: shareId,
            fileId: fileId,
            createdBy: this.currentUser.uid,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        await database.ref(`shared_links/${shareId}`).set(shareData);
        const shareableLink = `${window.location.origin}/?shared=${shareId}`;
        prompt('📎 Link para compartir (copia y pega):', shareableLink);
    }
};
