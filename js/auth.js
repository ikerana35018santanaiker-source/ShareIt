// js/auth.js
const Auth = {
    // 1. Iniciar sesión con Google
    async signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            console.log("Usuario de Google:", result.user);
            return result.user;
        } catch (error) {
            console.error("Error en login Google:", error);
            throw error;
        }
    },

    // 2. Registro con Correo y Contraseña
    async signUpWithEmail(email, password) {
        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            console.log("Usuario registrado con email:", result.user);
            return result.user;
        } catch (error) {
            console.error("Error en registro email:", error);
            throw error;
        }
    },

    // 3. Inicio de sesión con Correo y Contraseña
    async signInWithEmail(email, password) {
        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            return result.user;
        } catch (error) {
            console.error("Error en login email:", error);
            throw error;
        }
    },

    // 4. Inicio de sesión anónimo (solo acceso a links, no puede subir)
    async signInAnonymously() {
        try {
            const result = await auth.signInAnonymously();
            console.log("Usuario anónimo:", result.user);
            // Marcar como anónimo en la base de datos para restringir subidas
            await database.ref(`users/${result.user.uid}`).set({
                isAnonymous: true,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            return result.user;
        } catch (error) {
            console.error("Error en login anónimo:", error);
            throw error;
        }
    },

    // 5. Enviar link mágico al correo (acceso sin contraseña)
    async sendSignInLinkToEmail(email) {
        const actionCodeSettings = {
            url: window.location.href, // La URL a la que volverá tras hacer clic
            handleCodeInApp: true
        };
        try {
            await auth.sendSignInLinkToEmail(email, actionCodeSettings);
            // Guardar el email en localStorage para completar el proceso
            window.localStorage.setItem('emailForSignIn', email);
            alert('¡Link mágico enviado! Revisa tu correo (y spam).');
        } catch (error) {
            console.error("Error al enviar link mágico:", error);
            throw error;
        }
    },

    // Completar el inicio de sesión con link mágico (se llama al cargar la página si es necesario)
    async completeSignInWithLink() {
        if (auth.isSignInWithEmailLink(window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn');
            if (!email) {
                email = prompt('Por favor, confirma tu correo electrónico para completar el inicio');
            }
            try {
                const result = await auth.signInWithEmailLink(email, window.location.href);
                window.localStorage.removeItem('emailForSignIn');
                console.log("Acceso por link mágico exitoso:", result.user);
                return result.user;
            } catch (error) {
                console.error("Error al completar link mágico:", error);
                throw error;
            }
        }
        return null;
    },

    // 6. Restablecer contraseña (envía link al correo)
    async sendPasswordResetEmail(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            alert('Link para restablecer contraseña enviado a tu correo.');
        } catch (error) {
            console.error("Error al enviar reset:", error);
            throw error;
        }
    },

    // Cerrar sesión
    async signOut() {
        try {
            await auth.signOut();
            console.log("Sesión cerrada");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    },

    // Observar cambios en el estado de autenticación
    onAuthStateChanged(callback) {
        auth.onAuthStateChanged(callback);
    }
};
