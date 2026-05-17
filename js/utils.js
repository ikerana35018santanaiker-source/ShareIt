// js/utils.js - Funciones utilitarias para ShareIt

const Utils = {
    // Formatear bytes a unidades legibles
    formatBytes(bytes, decimals = 2) {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    // Generar ID único
    generateId() {
        return 'sh_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Determinar si un archivo debe guardarse como Base64
    isBase64File(file) {
        const MAX_BASE64_SIZE = 15 * 1024 * 1024; // 15 MB
        return file.size <= MAX_BASE64_SIZE;
    },

    // Obtener extensión de archivo
    getFileExtension(filename) {
        return filename.split('.').pop()?.toLowerCase() || '';
    },

    // Obtener tipo MIME genérico
    getMimeCategory(mimeType) {
        if (!mimeType) return 'other';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.includes('pdf')) return 'pdf';
        if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
        if (mimeType.includes('text') || mimeType.includes('document')) return 'document';
        return 'other';
    },

    // Obtener icono de Font Awesome según tipo
    getFileIcon(filename, mimeType) {
        if (!filename && !mimeType) return 'fa-solid fa-file';
        
        const ext = this.getFileExtension(filename || '');
        const category = this.getMimeCategory(mimeType || '');
        
        const iconMap = {
            'folder': 'fa-solid fa-folder',
            'image': 'fa-solid fa-file-image',
            'video': 'fa-solid fa-file-video',
            'audio': 'fa-solid fa-file-audio',
            'pdf': 'fa-solid fa-file-pdf',
            'archive': 'fa-solid fa-file-zipper',
            'document': 'fa-solid fa-file-lines',
            'code': 'fa-solid fa-file-code',
            'spreadsheet': 'fa-solid fa-file-csv',
            'presentation': 'fa-solid fa-file-powerpoint',
        };
        
        // Mapa por extensión específica
        const extMap = {
            'jpg': 'fa-solid fa-file-image',
            'jpeg': 'fa-solid fa-file-image',
            'png': 'fa-solid fa-file-image',
            'gif': 'fa-solid fa-file-image',
            'svg': 'fa-solid fa-file-image',
            'mp4': 'fa-solid fa-file-video',
            'mov': 'fa-solid fa-file-video',
            'avi': 'fa-solid fa-file-video',
            'mp3': 'fa-solid fa-file-audio',
            'wav': 'fa-solid fa-file-audio',
            'pdf': 'fa-solid fa-file-pdf',
            'doc': 'fa-solid fa-file-word',
            'docx': 'fa-solid fa-file-word',
            'xls': 'fa-solid fa-file-excel',
            'xlsx': 'fa-solid fa-file-excel',
            'ppt': 'fa-solid fa-file-powerpoint',
            'pptx': 'fa-solid fa-file-powerpoint',
            'zip': 'fa-solid fa-file-zipper',
            'rar': 'fa-solid fa-file-zipper',
            '7z': 'fa-solid fa-file-zipper',
            'txt': 'fa-solid fa-file-lines',
            'html': 'fa-solid fa-file-code',
            'css': 'fa-solid fa-file-code',
            'js': 'fa-solid fa-file-code',
            'json': 'fa-solid fa-file-code',
        };
        
        return extMap[ext] || iconMap[category] || 'fa-solid fa-file';
    },

    // Formatear fecha
    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Ahora mismo';
        if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} minutos`;
        if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} horas`;
        if (diff < 604800000) return `Hace ${Math.floor(diff / 86400000)} días`;
        
        return date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    },

    // Sanitizar nombre de archivo
    sanitizeFileName(name) {
        return name.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ .,_-]/g, '').trim();
    },

    // Truncar texto
    truncate(text, maxLength = 30) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    },

    // Devolver color según tipo de archivo
    getFileColor(filename, mimeType) {
        const category = this.getMimeCategory(mimeType);
        const colors = {
            'image': '#51CF66',
            'video': '#6C5CE7',
            'audio': '#FFD43B',
            'pdf': '#FF6B6B',
            'archive': '#FF922B',
            'document': '#4DABF7',
            'other': '#A0A0B8'
        };
        return colors[category] || colors.other;
    }
};

console.log('🛠️ Utilidades cargadas');
