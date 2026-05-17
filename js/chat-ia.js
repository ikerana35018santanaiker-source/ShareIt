// js/chat-ia.js - Chat con Inteligencia Artificial

const ChatIA = {
    conversationHistory: [],
    isProcessing: false,
    creditsUsed: 0,

    // Inicializar chat
    init() {
        this.loadCredits();
        console.log('🤖 Chat IA inicializado');
    },

    // Cargar créditos del usuario
    async loadCredits() {
        const user = auth.currentUser;
        if (!user) return;
        
        const profile = await Database.getUserProfile(user.uid);
        if (profile) {
            this.creditsUsed = profile.iaCreditsUsed || 0;
            this.updateCreditsDisplay();
        }
    },

    // Enviar mensaje
    async sendMessage() {
        if (this.isProcessing) return;
        
        const input = document.getElementById('ia-input');
        const message = input?.value.trim();
        
        if (!message) return;
        
        // Verificar créditos
        if (!this.hasCredits()) {
            UI.showNotification('No tienes créditos IA disponibles. Mejora tu plan.', 'error');
            return;
        }
        
        // Añadir mensaje del usuario al chat
        this.addMessage('user', message);
        input.value = '';
        
        this.isProcessing = true;
        this.showTypingIndicator();
        
        try {
            // Usar Puter.js para IA
            let response;
            
            if (typeof puter !== 'undefined' && puter.ai) {
                // Construir contexto con historial
                const context = this.buildContext();
                const fullPrompt = context + '\nUsuario: ' + message + '\nAsistente:';
                
                response = await puter.ai.chat(fullPrompt, {
                    model: 'default',
                    maxTokens: 500
                });
            } else {
                // Fallback si Puter IA no está disponible
                response = await this.fallbackResponse(message);
            }
            
            // Añadir respuesta al chat
            const responseText = response.message || response.text || response;
            this.addMessage('bot', responseText);
            
            // Descontar crédito
            this.useCredit();
            
            // Guardar en historial
            this.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: responseText }
            );
            
        } catch (error) {
            console.error('❌ Error en chat IA:', error);
            this.addMessage('bot', 'Lo siento, ocurrió un error. Intenta de nuevo más tarde.');
        } finally {
            this.hideTypingIndicator();
            this.isProcessing = false;
        }
    },

    // Construir contexto de conversación
    buildContext() {
        if (this.conversationHistory.length === 0) return '';
        
        const recentHistory = this.conversationHistory.slice(-6);
        return recentHistory
            .map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
            .join('\n');
    },

    // Fallback si Puter IA no está disponible
    async fallbackResponse(message) {
        const responses = [
            '¡Interesante pregunta! Estoy aquí para ayudarte con tus archivos y más.',
            'Puedo ayudarte a organizar tus archivos, buscar información y mucho más.',
            '¿Sabías que puedes compartir archivos con links personalizados en ShareIt?',
            'Estoy aprendiendo constantemente para ofrecerte mejores respuestas.',
            'Puedes preguntarme sobre tus archivos, o pedirme que te ayude con tareas.'
        ];
        
        // Simular delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            message: responses[Math.floor(Math.random() * responses.length)]
        };
    },

    // Añadir mensaje al chat
    addMessage(type, content) {
        const messagesContainer = document.getElementById('ia-messages');
        if (!messagesContainer) return;
        
        // Eliminar mensaje de bienvenida si existe
        const welcomeMsg = messagesContainer.querySelector('.ia-welcome');
        if (welcomeMsg) welcomeMsg.remove();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `ia-message ${type} animate__animated animate__fadeInUp`;
        messageDiv.innerHTML = content.replace(/\n/g, '<br>');
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    // Mostrar indicador de escritura
    showTypingIndicator() {
        const messagesContainer = document.getElementById('ia-messages');
        if (!messagesContainer) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ia-message bot typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    // Ocultar indicador de escritura
    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    },

    // Verificar créditos disponibles
    hasCredits() {
        const user = auth.currentUser;
        if (!user) return false;
        
        // Usuarios anónimos no tienen créditos
        if (user.isAnonymous) return false;
        
        const plan = PLANS.PERSONAL.GRATUITO;
        const maxCredits = plan.iaCredits || 200;
        
        return this.creditsUsed < maxCredits;
    },

    // Usar un crédito
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

    // Actualizar display de créditos
    updateCreditsDisplay() {
        const badge = document.getElementById('ia-credits-badge');
        if (!badge) return;
        
        const plan = PLANS.PERSONAL.GRATUITO;
        const maxCredits = plan.iaCredits || 200;
        const remaining = Math.max(0, maxCredits - this.creditsUsed);
        
        badge.textContent = `${remaining} créditos`;
        
        if (remaining < 20) {
            badge.style.color = '#FF6B6B';
        }
    },

    // Limpiar historial
    clearHistory() {
        this.conversationHistory = [];
        const messagesContainer = document.getElementById('ia-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="ia-welcome">
                    <i class="fa-solid fa-robot fa-2x mb-10" style="color: #6C5CE7;"></i>
                    <p>¡Hola! Soy tu asistente IA. ¿En qué puedo ayudarte?</p>
                </div>
            `;
        }
    },

    // Obtener sugerencias basadas en archivos
    async getFileSuggestions() {
        const user = auth.currentUser;
        if (!user) return [];
        
        const files = await Database.getAllUserFiles(user.uid);
        const activeFiles = files.filter(f => !f.inTrash);
        
        const suggestions = [];
        
        if (activeFiles.length > 10) {
            suggestions.push('Tienes muchos archivos, ¿quieres que te ayude a organizarlos?');
        }
        
        const largeFiles = activeFiles.filter(f => f.size > 100 * 1024 * 1024);
        if (largeFiles.length > 0) {
            suggestions.push(`Tienes ${largeFiles.length} archivos grandes. ¿Necesitas liberar espacio?`);
        }
        
        return suggestions;
    }
};

console.log('🤖 Chat IA cargado');
