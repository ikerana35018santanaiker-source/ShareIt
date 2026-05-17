// js/utils.js
const Utils = {
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    generateId() {
        return 'sh_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    },

    isBase64File(file) {
        const limitMB = 15;
        return file.size <= limitMB * 1024 * 1024;
    },

    // Obtener extensión del archivo
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    },

    // Icono según extensión
    getFileIcon(filename) {
        const ext = this.getFileExtension(filename);
        const icons = {
            pdf: '📕', doc: '📘', docx: '📘', xls: '📊', jpg: '🖼️', png: '🖼️',
            mp4: '🎬', mp3: '🎵', zip: '📦', folder: '📁'
        };
        return icons[ext] || '📄';
    }
};
