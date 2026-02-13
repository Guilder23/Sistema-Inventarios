/**
 * Script de validación del formulario de login
 */

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!username || !password) {
                e.preventDefault();
                mostrarAlerta('Por favor, complete todos los campos', 'error');
                return false;
            }

            // Validar longitud mínima del usuario
            if (username.length < 3) {
                e.preventDefault();
                mostrarAlerta('El usuario debe tener al menos 3 caracteres', 'error');
                return false;
            }

            // Validar longitud mínima de contraseña
            if (password.length < 6) {
                e.preventDefault();
                mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'error');
                return false;
            }
        });
    }

    /**
     * Función para mostrar alertas personalizadas
     * @param {string} mensaje - Mensaje a mostrar
     * @param {string} tipo - Tipo de alerta (success, error, warning)
     */
    function mostrarAlerta(mensaje, tipo = 'error') {
        // Crear elemento de alerta
        const alerta = document.createElement('div');
        alerta.className = `alerta alerta-${tipo}`;
        alerta.textContent = mensaje;
        alerta.style.marginBottom = '20px';

        // Insertar alerta en el formulario
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.parentNode.insertBefore(alerta, loginForm);
        }

        // Remover alerta después de 5 segundos
        setTimeout(() => {
            alerta.remove();
        }, 5000);
    }
});
