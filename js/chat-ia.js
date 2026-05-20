// js/chat-ia.js — Chat IA con Puter.js AI (corregido)

const ChatIA = {
    conversationHistory: [],
    isProcessing: false,
    creditsUsed: 0,
    maxCredits: 200,
    puterAIReady: false,

    // ── Inicializar ──────────────────────────────────────────────────────
    init() {
        this.loadCredits();
        this._checkPuterAI();
        this._setupInputListener();
        console.log('🤖 Chat IA inicializado');
    },

    // Detectar si Puter AI está disponible
    async _checkPuterAI() {
        let tries = 0;
        const check = () => {
            tries++;
            if (typeof puter !== 'undefined' && puter.ai && typeof puter.ai.chat === 'function') {
                this.puterAIReady = true;
                console.log('✅ Puter.js AI disponible');
            } else if (tries < 20) {
                setTimeout(check, 500);
            } else {
                console.info('ℹ️ Puter.js AI no disponible — usando respuestas locales');
            }
        };
        check();
    },

    // Auto-resize del textarea + enviar con Enter
    _setupInputListener() {
        const input = document.getElementById('ia-input');
        if (!input) return;
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ChatIA.sendMessage();
            }
        });
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
    },

    // ── Cargar créditos ──────────────────────────────────────────────────
    async loadCredits() {
        const user = auth.currentUser;
        if (!user || user.isAnonymous) {
            this.maxCredits = 0;
            this.updateCreditsDisplay();
            return;
        }
        try {
            const profile = await Database.getUserProfile(user.uid);
            if (profile) {
                this.creditsUsed = profile.iaCreditsUsed || 0;
                const planId = profile.plan || 'PERSONAL_GRATUITO';
                const credits = PLANS.getIACredits(planId);
                this.maxCredits = credits === Infinity ? 999999 : credits;
            }
        } catch (e) { /* sin red, usar defaults */ }
        this.updateCreditsDisplay();
    },

    // ── Enviar mensaje ───────────────────────────────────────────────────
    async sendMessage() {
        if (this.isProcessing) return;

        const input = document.getElementById('ia-input');
        const message = input?.value.trim();
        if (!message) return;

        if (!this.hasCredits()) {
            UI.showNotification('Sin créditos IA disponibles. Mejora tu plan.', 'error');
            return;
        }

        this.addMessage('user', message);
        input.value = '';
        input.style.height = 'auto';

        this.isProcessing = true;
        this.showTypingIndicator();

        try {
            let responseText;

            if (this.puterAIReady) {
                // ── Puter.js AI ──────────────────────────────────────────
                // La API actual de Puter: puter.ai.chat(prompt, { model, stream })
                // O también: puter.ai.chat([{role, content}])
                try {
                    const messages = [
                        {
                            role: 'system',
                            content: 'Eres ShareIt AI, un asistente amigable especializado en ayudar con archivos, organización y productividad. Siempre respondes en español de forma clara, concisa y útil.'
                        },
                        ...this.conversationHistory.slice(-10), // últimos 10 mensajes de contexto
                        { role: 'user', content: message }
                    ];

                    const response = await puter.ai.chat(messages);

                    // Puter devuelve distintos formatos según la versión
                    responseText = response?.message?.content
                        || response?.message
                        || response?.content
                        || response?.text
                        || (typeof response === 'string' ? response : null)
                        || 'No pude generar una respuesta.';

                } catch (puterErr) {
                    console.warn('Puter AI error, usando fallback:', puterErr.message);
                    responseText = this.generateFallbackResponse(message);
                }
            } else {
                responseText = this.generateFallbackResponse(message);
            }

            this.addMessage('bot', responseText);

            // Guardar en historial (máx 50 mensajes)
            this.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: responseText }
            );
            if (this.conversationHistory.length > 50) {
                this.conversationHistory = this.conversationHistory.slice(-50);
            }

            await this.useCredit();

        } catch (error) {
            console.error('❌ Error en Chat IA:', error);
            this.addMessage('bot', '❌ Ocurrió un error inesperado. Inténtalo de nuevo.');
        } finally {
            this.hideTypingIndicator();
            this.isProcessing = false;
        }
    },

    // ── Respuestas locales de fallback ───────────────────────────────────
    generateFallbackResponse(message) {
        const m = message.toLowerCase();

        if (m.match(/^(hola|hi|hey|buenos|buenas)/))
            return '¡Hola! 👋 Soy **ShareIt AI**. Puedo ayudarte con:\n\n📁 Organizar tus archivos\n🔗 Compartir documentos\n💾 Gestionar tu almacenamiento\n⭐ Destacar favoritos\n\n¿En qué puedo ayudarte?';

        if (m.includes('subir') || m.includes('upload'))
            return 'Para **subir archivos** tienes varias opciones:\n\n• Haz clic en el botón **Subir** en la barra superior\n• **Arrastra y suelta** archivos en el área principal\n• Archivos hasta 15 MB → se guardan directamente\n• Archivos mayores → se usan Puter.js en la nube';

        if (m.includes('carpeta') || m.includes('folder'))
            return 'Para **crear una carpeta** haz clic en el botón **Carpeta** (esquina superior derecha) e introduce el nombre. Puedes organizar tus archivos en subcarpetas navegando dentro de ellas.';

        if (m.includes('compartir') || m.includes('link') || m.includes('enlace'))
            return 'Para **compartir un archivo**:\n\n1. Pasa el cursor sobre el archivo\n2. Haz clic en el icono 🔗 compartir\n3. Copia el link generado\n\nCualquiera con el link puede ver el archivo.';

        if (m.includes('espacio') || m.includes('almacenamiento') || m.includes('gb'))
            return 'Tu **espacio de almacenamiento** según el plan:\n\n🆓 Gratuito: **15 GB**\n⭐ Plus: **125 GB** — desde 0,49 €/mes\n👑 Pro: **350 GB** — 19,99 €/mes\n🏢 Business Pro: **500 TB** — 59,99 €/mes\n\nVes tu uso actual en la barra lateral izquierda.';

        if (m.includes('plan') || m.includes('precio') || m.includes('pago'))
            return 'Los **planes de ShareIt** son:\n\n🆓 **Gratuito**: 15 GB, 200 créditos IA únicos\n⭐ **Plus**: 125 GB, 350 créditos/mes — 1,99 €/mes\n👑 **Pro**: 350 GB, 750 créditos/mes — 19,99 €/mes\n\nHaz clic en **Mejorar plan** en la barra lateral para ver todos los detalles.';

        if (m.includes('papelera') || m.includes('eliminar') || m.includes('borrar'))
            return 'Para **eliminar archivos**:\n\n• Pasa el cursor sobre el archivo → icono 🗑️\n• El archivo va a la **Papelera** (recuperable)\n• En Papelera puedes **Restaurar** o eliminar permanentemente\n• Shift+clic selecciona varios archivos a la vez';

        if (m.includes('gracias') || m.includes('thanks'))
            return '¡De nada! 😊 Si necesitas algo más, aquí estoy.';

        return `Entendido: "_${message}_"\n\nPuedo ayudarte con:\n📁 Archivos y carpetas\n🔗 Compartir con links\n💾 Almacenamiento y planes\n⭐ Favoritos y papelera\n\n¿Puedes darme más detalles sobre lo que necesitas?`;
    },

    // ── UI helpers ───────────────────────────────────────────────────────
    addMessage(type, content) {
        const container = document.getElementById('ia-messages');
        if (!container) return;

        const welcome = container.querySelector('.ia-welcome');
        if (welcome) welcome.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = `ia-message ${type} animate__animated animate__fadeInUp`;

        // Markdown mínimo
        const formatted = content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');

        msgDiv.innerHTML = formatted;
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    },

    showTypingIndicator() {
        const container = document.getElementById('ia-messages');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'ia-message bot typing-indicator';
        div.id = 'typing-indicator';
        div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    hideTypingIndicator() {
        document.getElementById('typing-indicator')?.remove();
    },

    hasCredits() {
        const user = auth.currentUser;
        if (!user || user.isAnonymous) return false;
        return this.creditsUsed < this.maxCredits;
    },

    async useCredit() {
        this.creditsUsed++;
        this.updateCreditsDisplay();
        const user = auth.currentUser;
        if (user && !user.isAnonymous) {
            try {
                await Database.updateUserProfile(user.uid, { iaCreditsUsed: this.creditsUsed });
            } catch (_) {}
        }
    },

    updateCreditsDisplay() {
        const badge = document.getElementById('ia-credits-badge');
        if (!badge) return;
        const remaining = Math.max(0, this.maxCredits - this.creditsUsed);
        if (this.maxCredits >= 999999) {
            badge.textContent = '∞ créditos';
            badge.style.color = '#00CECE';
        } else if (this.maxCredits === 0) {
            badge.textContent = 'No disponible';
            badge.style.color = '#FF6B6B';
        } else {
            badge.textContent = `${remaining} crédito${remaining !== 1 ? 's' : ''}`;
            badge.style.color = remaining < 20 ? '#FF6B6B' : '#A29BFE';
        }
    },

    clearChat() {
        this.conversationHistory = [];
        const container = document.getElementById('ia-messages');
        if (container) {
            container.innerHTML = `
                <div class="ia-welcome">
                    <i class="fa-solid fa-robot fa-2x mb-10" style="color:#6C5CE7;"></i>
                    <p>¡Hola! Soy ShareIt AI. Pregúntame lo que necesites.</p>
                </div>`;
        }
    }
};

console.log('🤖 ChatIA cargado');
