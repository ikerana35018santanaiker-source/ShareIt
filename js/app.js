// js/app.js — Orquestador principal de ShareIt

const App = {
    initialized: false,
    _authTimeout: null,

    async init() {
        if (this.initialized) return;
        this.initialized = true;
        console.log('🚀 Iniciando ShareIt…');

        // Timeout de seguridad: si Firebase no responde en 8s → mostrar auth
        this._authTimeout = setTimeout(() => {
            console.warn('⚠️ Firebase tardó demasiado — mostrando pantalla de auth');
            this._showScreen('auth');
        }, 8000);

        // Completar login por link mágico si aplica
        try { await Auth.completeSignInWithLink(); } catch (_) {}

        // Observador de autenticación
        Auth.onAuthStateChanged(async user => {
            clearTimeout(this._authTimeout);

            if (user) {
                console.log('👤 Usuario autenticado:', user.uid);
                try { await Auth.createUserProfile(user); } catch (_) {}
                await UI.renderApp(user);
                this._setupRealtimeListeners(user.uid);
            } else {
                console.log('👋 No autenticado — mostrando auth');
                this._showScreen('auth');
            }
        });

        this._setupGlobalEvents();
        this._checkSharedLink();
    },

    // Controla qué pantalla es visible usando clases (no display directo)
    _showScreen(screen) {
        const loading = document.getElementById('loading-screen');
        const auth    = document.getElementById('auth-container');
        const app     = document.getElementById('app-container');
        const fab     = document.getElementById('fab-ia');

        // Ocultar todo primero
        loading.style.display = 'none';
        auth.classList.remove('visible');
        auth.style.display = 'none';
        app.classList.remove('show', 'visible');
        app.style.display = 'none';
        if (fab) fab.style.display = 'none';

        if (screen === 'auth') {
            auth.style.display = 'flex';
        }
        // 'app' lo maneja UI.renderApp()
    },

    _setupRealtimeListeners(userId) {
        database.ref(`files/${userId}`).on('child_changed', () => {
            if (UI.currentView !== 'shared') UI.navigateTo(UI.currentView, UI.currentFolder);
        });
        database.ref(`files/${userId}`).on('child_removed', () => {
            if (UI.currentView !== 'shared') UI.navigateTo(UI.currentView, UI.currentFolder);
        });
        database.ref(`users/${userId}`).on('value', snap => {
            const profile = snap.val();
            if (profile) UI.updateStorageBar(profile);
        });
    },

    _setupGlobalEvents() {
        document.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'Escape') {
                UI.closeModal?.();
                UI.closeFilePreview?.();
                document.querySelector('.context-menu')?.remove();
            }
            if (e.ctrlKey && e.key === 'u') { e.preventDefault(); document.getElementById('file-input')?.click(); }
            if (e.ctrlKey && e.key === 'n') { e.preventDefault(); UI.createFolder?.(); }
            if (e.ctrlKey && e.key === 'i') { e.preventDefault(); UI.toggleIAPanel?.(); }
        });

        // Drag & drop
        const main = document.getElementById('main-content');
        if (main) {
            let n = 0;
            main.addEventListener('dragenter',  e => { e.preventDefault(); n++; main.classList.add('drag-over'); });
            main.addEventListener('dragleave',  e => { e.preventDefault(); n--; if (n <= 0) { n = 0; main.classList.remove('drag-over'); } });
            main.addEventListener('dragover',   e => e.preventDefault());
            main.addEventListener('drop', async e => {
                e.preventDefault(); n = 0; main.classList.remove('drag-over');
                if (e.dataTransfer.files.length) await UI.handleFileUpload(e.dataTransfer.files);
            });
        }

        window.addEventListener('online',  () => UI.showNotification('Conexión restablecida ✓', 'success'));
        window.addEventListener('offline', () => UI.showNotification('Sin conexión a internet', 'error'));
    },

    async _checkSharedLink() {
        const sharedId = new URLSearchParams(window.location.search).get('shared');
        if (!sharedId) return;
        if (!auth.currentUser) {
            try { await Auth.signInAnonymously(); } catch (_) {}
        }
    }
};

// ── Arrancar ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    App.init().catch(err => {
        console.error('❌ Error fatal:', err);
        document.getElementById('loading-screen').innerHTML = `
            <div style="text-align:center;padding:40px;">
                <i class="fa-solid fa-triangle-exclamation fa-3x" style="color:#FF6B6B;"></i>
                <h2 style="margin:20px 0 8px;font-family:'Plus Jakarta Sans',sans-serif;">Error al cargar ShareIt</h2>
                <p style="color:#A0A0B8;margin-bottom:20px;">Por favor recarga la página</p>
                <button onclick="location.reload()"
                    style="background:#6C5CE7;color:#fff;border:none;padding:12px 28px;
                    border-radius:12px;cursor:pointer;font-size:1rem;font-family:inherit;">
                    <i class="fa-solid fa-rotate"></i> Recargar
                </button>
            </div>`;
    });
});

window.addEventListener('unhandledrejection', ev => console.warn('⚠️ Promesa rechazada:', ev.reason));
console.log('🚀 App.js listo');
