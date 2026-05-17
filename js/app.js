// js/app.js
document.addEventListener('DOMContentLoaded', async () => {
    // Intentar completar inicio de sesión con link mágico al cargar la página
    await Auth.completeSignInWithLink();

    // Observar cambios de autenticación para mostrar la UI correcta
    Auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('Usuario autenticado:', user.uid);
            // Verificar si es anónimo para deshabilitar botones de subida
            const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = userSnapshot.val();
            UI.renderApp(user, userData); // Mostrar la app principal
        } else {
            console.log('Usuario no autenticado');
            UI.renderAuthForms(); // Mostrar formularios de login
        }
    });

    // Aquí se enlazarían los eventos de clic de los botones de auth con Auth.js
    // Ejemplo conceptual (se haría en ui.js al renderizar los formularios)
});
