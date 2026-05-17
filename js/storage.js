// js/storage.js
const StorageManager = {
    // Esta función decide dónde guardar según el tamaño
    async uploadFile(userId, file) {
        // Estricto: verificar tamaño
        if (Utils.isBase64File(file)) {
            console.log(`[Base64] Subiendo archivo pequeño: ${file.name}`);
            return this._uploadAsBase64(userId, file);
        } else {
            console.log(`[Puter.js] Subiendo archivo grande: ${file.name}`);
            return this._uploadToPuter(userId, file);
        }
    },

    // Guardar como Base64 en Realtime Database
    async _uploadAsBase64(userId, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const base64String = event.target.result; // Incluye 'data:...;base64,...'
                    const fileId = Utils.generateId();
                    const fileData = {
                        id: fileId,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        base64Url: base64String, // ¡URL en Base64!
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        userId: userId,
                        parentFolder: 'root', // Por defecto en raíz
                        inTrash: false,
                        sharedWith: {}
                    };

                    // Guardar metadatos en Realtime Database
                    await database.ref(`files/${userId}/${fileId}`).set(fileData);
                    resolve(fileData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file); // Convierte a Base64
        });
    },

    // Subir archivo >15MB usando la API de Puter.js
    async _uploadToPuter(userId, file) {
        // *** AVISO IMPORTANTE ***
        // Aquí debes integrar la API real de Puter.js.
        // Este es un ejemplo conceptual. Necesitarás su librería y autenticación.
        console.warn("Integración con Puter.js pendiente de configurar API key/script.");
        
        // EJEMPLO CONCEPTUAL (NO FUNCIONAL SIN LA LIBRERÍA DE PUTER)
        /*
        try {
            // 1. Subir a Puter
            const puterFile = await puter.upload(file, { 
                dedicated: true // Para archivos grandes
            });
            
            // 2. Obtener la URL pública o ID de Puter
            const puterUrl = puterFile.url; 
            
            // 3. Guardar solo la referencia en Firebase
            const fileId = Utils.generateId();
            const fileData = {
                id: fileId,
                name: file.name,
                type: file.type,
                size: file.size,
                puterUrl: puterUrl, // Guardamos la URL de Puter.js
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                userId: userId,
                parentFolder: 'root',
                inTrash: false,
                sharedWith: {}
            };
            await database.ref(`files/${userId}/${fileId}`).set(fileData);
            return fileData;
        } catch (error) {
            console.error("Error subiendo a Puter.js", error);
            throw error;
        }
        */
        // Por ahora, simulamos un error para indicar que falta la integración.
        throw new Error("La integración con Puter.js no está activa. Configúrala en storage.js.");
    },

    // Obtener todos los archivos de un usuario (y filtrar en UI)
    async getUserFiles(userId) {
        const snapshot = await database.ref(`files/${userId}`).once('value');
        return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
};
