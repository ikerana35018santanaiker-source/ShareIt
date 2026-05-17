// js/storage.js
const StorageManager = {
    puterInstance: null,

    // Inicializar Puter (debe llamarse tras login)
    async initPuter() {
        if (typeof puter !== 'undefined') {
            // En producción usarías: puter.auth.setAPIKey('tu-api-key')
            this.puterInstance = puter;
            console.log('Puter.js inicializado');
        } else {
            console.warn('Puter SDK no cargado. Los archivos grandes no funcionarán.');
        }
    },

    async uploadFile(userId, file) {
        if (Utils.isBase64File(file)) {
            return this._uploadAsBase64(userId, file);
        } else {
            return this._uploadToPuter(userId, file);
        }
    },

    async _uploadAsBase64(userId, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fileId = Utils.generateId();
                const fileData = {
                    id: fileId,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    base64Url: e.target.result,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    userId,
                    parentFolder: UI.currentFolder || 'root',
                    inTrash: false
                };
                await database.ref(`files/${userId}/${fileId}`).set(fileData);
                resolve(fileData);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    async _uploadToPuter(userId, file) {
        if (!this.puterInstance) throw new Error('Puter no inicializado');
        try {
            // Subir archivo a Puter.js
            const puterFile = await this.puterInstance.upload(file, {
                name: file.name,
                dedicated: true // Para archivos grandes
            });
            
            // Guardar metadatos en Firebase
            const fileId = Utils.generateId();
            const fileData = {
                id: fileId,
                name: file.name,
                type: file.type,
                size: file.size,
                puterFileId: puterFile.id || puterFile.uid,
                puterUrl: puterFile.url || puterFile.link,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                userId,
                parentFolder: UI.currentFolder || 'root',
                inTrash: false
            };
            await database.ref(`files/${userId}/${fileId}`).set(fileData);
            return fileData;
        } catch (error) {
            console.error('Error subiendo a Puter:', error);
            throw error;
        }
    },

    // Descargar/obtener URL de acceso
    async getFileUrl(fileData) {
        if (fileData.base64Url) return fileData.base64Url;
        if (fileData.puterFileId && this.puterInstance) {
            const f = await this.puterInstance.fs.get(fileData.puterFileId);
            return f.url;
        }
        return null;
    }
};
