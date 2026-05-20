// js/storage.js — CORREGIDO: Puter.js + Base64

const StorageManager = {
    puterReady: false,
    puterChecked: false,

    // ── Inicializar Puter.js ──────────────────────────────────────────────
    async initPuter() {
        if (this.puterChecked) return this.puterReady;
        this.puterChecked = true;

        // puter.js necesita tiempo para cargar y autenticarse
        return new Promise(resolve => {
            let tries = 0;
            const check = () => {
                tries++;
                if (typeof puter !== 'undefined' && puter.fs) {
                    // Probar con una operación real
                    puter.fs.stat('/')
                        .then(() => {
                            this.puterReady = true;
                            console.log('✅ Puter.js operativo');
                            resolve(true);
                        })
                        .catch(() => {
                            // stat puede fallar pero puter puede estar operativo
                            // intentar un mkdir de prueba
                            puter.fs.mkdir('/__shareit_probe__', { overwrite: true })
                                .then(() => {
                                    this.puterReady = true;
                                    puter.fs.delete('/__shareit_probe__').catch(() => {});
                                    console.log('✅ Puter.js operativo (probe)');
                                    resolve(true);
                                })
                                .catch(err => {
                                    // Puter está pero no dejó escribir — lo consideramos operativo
                                    // (errores de auth pueden ser transitorios)
                                    this.puterReady = true;
                                    console.warn('⚠️ Puter.js disponible con restricciones:', err.message);
                                    resolve(true);
                                });
                        });
                } else if (tries < 15) {
                    // Esperar hasta 7.5 s en pasos de 500 ms
                    setTimeout(check, 500);
                } else {
                    console.info('ℹ️ Puter.js no disponible — solo Base64 (<15 MB)');
                    this.puterReady = false;
                    resolve(false);
                }
            };
            check();
        });
    },

    // ── Subir archivo ─────────────────────────────────────────────────────
    async uploadFile(userId, file, onProgress = null) {
        // Verificar espacio
        const ok = await this.checkSpaceAvailable(userId, file.size);
        if (!ok) throw new Error('No tienes suficiente espacio de almacenamiento');

        if (Utils.isBase64File(file)) {
            console.log(`📦 Base64: ${file.name} (${Utils.formatBytes(file.size)})`);
            return await this._uploadAsBase64(userId, file, onProgress);
        }

        // Archivo >15 MB → intentar Puter
        await this.initPuter();
        if (this.puterReady) {
            console.log(`☁️ Puter.js: ${file.name} (${Utils.formatBytes(file.size)})`);
            return await this._uploadToPuter(userId, file, onProgress);
        }

        throw new Error('El archivo supera 15 MB y Puter.js no está disponible. Usa un archivo más pequeño o abre ShareIt desde puter.com.');
    },

    // ── Base64 ────────────────────────────────────────────────────────────
    _uploadAsBase64(userId, file, onProgress) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onprogress = e => {
                if (onProgress && e.lengthComputable)
                    onProgress(Math.round((e.loaded / e.total) * 90));
            };

            reader.onload = async e => {
                try {
                    const fileId = Utils.generateId();
                    const fileData = {
                        id: fileId,
                        name: Utils.sanitizeFileName(file.name) || file.name,
                        originalName: file.name,
                        type: file.type || 'application/octet-stream',
                        size: file.size,
                        base64Url: e.target.result,
                        storageMethod: 'base64',
                        userId,
                        parentFolder: (typeof UI !== 'undefined' ? UI.currentFolder : null) || null,
                        inTrash: false,
                        starred: false,
                        shared: false,
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        updatedAt: firebase.database.ServerValue.TIMESTAMP
                    };

                    await Database.createFile(userId, fileData);
                    await Database.updateStorageUsed(userId);

                    if (onProgress) onProgress(100);
                    resolve(fileData);
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
        });
    },

    // ── Puter.js ──────────────────────────────────────────────────────────
    async _uploadToPuter(userId, file, onProgress) {
        if (onProgress) onProgress(5);

        // Carpeta del usuario en Puter
        const userFolder = `/shareit_${userId}`;
        try { await puter.fs.mkdir(userFolder, { overwrite: false }); } catch (_) { /* ya existe */ }

        if (onProgress) onProgress(10);

        const safeName = `${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`;
        const destPath = `${userFolder}/${safeName}`;

        // puter.fs.write acepta File/Blob directamente
        let uploadResult;
        try {
            uploadResult = await puter.fs.write(destPath, file, { overwrite: true });
            if (onProgress) onProgress(90);
        } catch (writeErr) {
            // Fallback: intentar con upload() si existe
            if (puter.fs.upload) {
                uploadResult = await puter.fs.upload(file, destPath, {
                    overwrite: true,
                    onProgress: p => {
                        if (onProgress) onProgress(10 + Math.round((p.percent || 0) * 0.8));
                    }
                });
            } else {
                throw writeErr;
            }
        }

        if (onProgress) onProgress(95);

        const fileId = Utils.generateId();
        const fileData = {
            id: fileId,
            name: Utils.sanitizeFileName(file.name) || file.name,
            originalName: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            puterPath: destPath,
            puterFileId: uploadResult?.uid || uploadResult?.id || fileId,
            storageMethod: 'puter',
            userId,
            parentFolder: (typeof UI !== 'undefined' ? UI.currentFolder : null) || null,
            inTrash: false,
            starred: false,
            shared: false,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };

        await Database.createFile(userId, fileData);
        await Database.updateStorageUsed(userId);

        if (onProgress) onProgress(100);
        return fileData;
    },

    // ── Obtener URL para preview/descarga ────────────────────────────────
    async getFileUrl(fileData) {
        if (!fileData) return null;

        if (fileData.storageMethod === 'base64' && fileData.base64Url)
            return fileData.base64Url;

        if (fileData.storageMethod === 'puter' && fileData.puterPath) {
            if (!this.puterReady) await this.initPuter();
            if (!this.puterReady) return null;

            try {
                // Intentar obtener URL de descarga pública
                if (puter.fs.getDownloadUrl) {
                    return await puter.fs.getDownloadUrl(fileData.puterPath);
                }
                // Alternativa: leer como blob y crear object URL
                const blob = await puter.fs.read(fileData.puterPath);
                if (blob instanceof Blob || blob instanceof File) {
                    return URL.createObjectURL(blob);
                }
                // Si devuelve texto (base64 o url)
                if (typeof blob === 'string') return blob;
            } catch (err) {
                console.warn('No se pudo obtener URL de Puter:', err.message);
            }
            return null;
        }

        return null;
    },

    // ── Descargar archivo ────────────────────────────────────────────────
    async downloadFile(fileData) {
        if (!fileData) return;
        const url = await this.getFileUrl(fileData);
        if (!url) {
            UI.showNotification('No se puede acceder al archivo', 'error');
            return;
        }

        const a = document.createElement('a');
        a.href = url;
        a.download = fileData.originalName || fileData.name;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            // Liberar object URL si la creamos nosotros
            if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        }, 1000);
    },

    // ── Eliminar permanentemente ─────────────────────────────────────────
    async deleteFilePermanently(userId, fileData) {
        if (fileData.storageMethod === 'puter' && fileData.puterPath) {
            if (!this.puterReady) await this.initPuter();
            if (this.puterReady) {
                try { await puter.fs.delete(fileData.puterPath); } catch (_) {}
            }
        }
        await Database.deleteFile(userId, fileData.id);
        await Database.updateStorageUsed(userId);
    },

    // ── Verificar espacio disponible ─────────────────────────────────────
    async checkSpaceAvailable(userId, newFileSize) {
        try {
            const profile = await Database.getUserProfile(userId);
            if (!profile) return true; // primera vez, dejar pasar
            const planId   = profile.plan || 'PERSONAL_GRATUITO';
            const maxStore = PLANS.getStorageLimit(planId);
            const used     = profile.storageUsed || 0;
            return (used + newFileSize) <= maxStore;
        } catch {
            return true;
        }
    }
};

// Intentar init de Puter después de que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => StorageManager.initPuter(), 2000);
});

console.log('☁️ StorageManager cargado');
