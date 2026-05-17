// js/chat-ia.js - Chat IA con Puter.js (SIN API KEY)

const ChatIA = {
    conversationHistory: [],
    isProcessing: false,
    creditsUsed: 0,
    maxCredits: 200,

    // Inicializar
    init() {
        this.loadCredits();
        console.log('🤖 Chat IA listo (Puter.js AI - sin API Key)');
    },

    // Cargar créditos del perfil
    async loadCredits() {
        const user = auth.currentUser;
        if (!user || user.isAnonymous) {
            this.maxCredits = 0;
            return;
        }
        
        const profile = await Database.getUserProfile(user.uid);
        if (profile) {
            this.creditsUsed = profile.iaCreditsUsed || 0;
            const planId = profile.plan || 'PERSONAL_GRATUITO';
            this.maxCredits = PLANS.getIACredits(planId);
            if (this.maxCredits === Infinity) this.maxCredits = 999999;
        }
        
        this.updateCreditsDisplay();
    },

    // Enviar mensaje al chat
    async sendMessage() {
        if (this.isProcessing) return;
        
        const input = document.getElementById('ia-input');
        const message = input?.value.trim();
        if (!message) return;
        
        // Verificar créditos
        if (!this.hasCredits()) {
            UI.showNotification('Sin créditos IA. Mejora tu plan.', 'error');
            return;
        }
        
        // Mostrar mensaje del usuario
        this.addMessage('user', message);
        input.value = '';
        input.style.height = 'auto';
        
        this.isProcessing = true;
        this.showTypingIndicator();
        
        try {
            let response;
            
            // Usar Puter.js AI (NO necesita API Key)
            if (typeof putter !== 'undefined' && puter.ai) {
                response = await puter.ai.chat(message, {
                    systemMessage: 'Eres ShareIt AI, un asistente amigable especializado en ayudar con archivos, organización y productividad. Respondes en español de forma clara y útil.',
                    temperature: 0.7,
                    maxTokens: 1000
                });
            } else {
                // Fallback si Puter AI no está disponible
                response = this.generateFallbackResponse(message);
            }
            
            // Extraer texto de la respuesta
            const responseText = typeof response === 'string' 
                ? response 
                : response?.message?.content || response?.message || response?.text || 'Lo siento, no pude procesar tu mensaje.';
            
            // Mostrar respuesta
            this.addMessage('bot', responseText);
            
            // Guardar en historial
            this.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: responseText }
            );
            
            // Limitar historial a 50 mensajes
            if (this.conversationHistory.length > 50) {
                this.conversationHistory = this.conversationHistory.slice(-50);
            }
            
            // Consumir crédito
            await this.useCredit();
            
        } catch (error) {
            console.error('❌ Error en Chat IA:', error);
            this.addMessage('bot', '❌ Ocurrió un error. Por favor, intenta de nuevo.');
        } finally {
            this.hideTypingIndicator();
            this.isProcessing = false;
        }
    },

    // Respuesta de respaldo si Puter AI no está disponible
    generateFallbackResponse(message) {
        const lowerMsg = message.toLowerCase();
        
        if (lowerMsg.includes('hola') || lowerMsg.includes('buenos días')) {
            return '¡Hola! 👋 Soy ShareIt AI. Puedo ayudarte con:\n\n📁 Organizar tus archivos\n🔍 Buscar documentos\n💡 Consejos de productividad\nℹ️ Información sobre tu cuenta\n\n¿En qué puedo ayudarte hoy?';
        }
        
        if (lowerMsg.includes('archivo') || lowerMsg.includes('archivos')) {
            return 'Puedo ayudarte con tus archivos. En ShareIt puedes:\n\n📤 Subir archivos (arrastra y suelta)\n📁 Crear carpetas para organizar\n🔗 Compartir con links\n⭐ Marcar favoritos\n🗑️ Mover a la papelera\n\n¿Necesitas ayuda con algo específico?';
        }
        
        if (lowerMsg.includes('espacio') || lowerMsg.includes('almacenamiento')) {
            return 'Tu espacio de almacenamiento depende de tu plan:\n\n🆓 Gratuito: 15 GB\n⭐ Plus: 125 GB\n👑 Pro: 350 GB\n\nPuedes ver tu espacio usado en la barra lateral. ¿Quieres saber más sobre los planes?';
        }
        
        return 'Gracias por tu mensaje. Soy ShareIt AI y estoy aquí para ayudarte con:\n\n📁 Gestión de archivos\n🔗 Compartir documentos\n💾 Almacenamiento\nℹ️ Información de tu cuenta\n\n¿Podrías ser más específico sobre lo que necesitas?';
    },

    // Añadir mensaje al chat
    addMessage(type, content) {
        const container = document.getElementById('ia-messages');
        if (!container) return;
        
        // Eliminar mensaje de bienvenida
        const welcome = container.querySelector('.ia-welcome');
        if (welcome) welcome.remove();
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `ia-message ${type} animate__animated animate__fadeInUp`;
        
        // Convertir saltos de línea en <br>
        const formattedContent = content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
        
        msgDiv.innerHTML = formattedContent;
        container.appendChild(msgDiv);
        
        // Scroll al final
        container.scrollTop = container.scrollHeight;
    },

    // Mostrar indicador de "escribiendo..."
    showTypingIndicator() {
        const container = document.getElementById('ia-messages');
        if (!container) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'ia-message bot typing-indicator';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        `;
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    },

    // Ocultar indicador
    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    },

    // Verificar créditos
    hasCredits() {
        const user = auth.currentUser;
        if (!user || user.isAnonymous) return false;
        return this.creditsUsed < this.maxCredits;
    },

    // Consumir crédito
    async useCredit() {
        this.creditsUsed++;
        this.updateCreditsDisplay();
        
        const user = auth.currentUser;
        if (user && !user.isAnonymous) {
            await Database.updateUserProfile(user.uid, {
                iaCreditsUsed: this.creditsUsed
            });
        }
    },

    // Actualizar display
    updateCreditsDisplay() {
        const badge = document.getElementById('ia-credits-badge');
        if (!badge) return;
        
        const remaining = Math.max(0, this.maxCredits - this.creditsUsed);
        
        if (this.maxCredits >= 999999) {
            badge.textContent = '∞ créditos';
            badge.style.color = '#00CECE';
        } else {
            badge.textContent = `${remaining} créditos`;
            badge.style.color = remaining < 20 ? '#FF6B6B' : '#A29BFE';
        }
    },

    // Limpiar chat
    clearChat() {
        this.conversationHistory = [];
        const container = document.getElementById('ia-messages');
        if (container) {
            container.innerHTML = `
                <div class="ia-welcome">
                    <i class="fa-solid fa-robot fa-2x mb-10" style="color: #6C5CE7;"></i>
                    <p>¡Hola! Soy ShareIt AI. Pregúntame lo que necesites.</p>
                </div>
            `;
        }
    }
};

console.log('🤖 ChatIA cargado (Puter.js AI sin API Key)');
