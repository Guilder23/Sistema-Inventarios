/**
 * Script de Formulario de Login - Moderno y Profesional
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // ===== ELEMENTOS DEL DOM =====
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const submitBtn = document.getElementById('submitBtn');

    // ===== FUNCIONALIDAD: VER/OCULTAR CONTRASEÑA =====
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            
            // Cambiar icono
            const icon = this.querySelector('i');
            if (isPassword) {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
                this.setAttribute('title', 'Ocultar contraseña');
            } else {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
                this.setAttribute('title', 'Mostrar contraseña');
            }
        });
    }

    // ===== VALIDACIÓN DEL FORMULARIO =====
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            // Validar que los campos no estén vacíos
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !password) {
                e.preventDefault();
                mostrarError('Por favor, complete todos los campos');
                return false;
            }

            if (username.length < 3) {
                e.preventDefault();
                mostrarError('El usuario debe tener al menos 3 caracteres');
                return false;
            }

            // Desactivar botón durante envío
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

            return true;
        });

        // Limpiar errores al escribir
        usernameInput.addEventListener('input', limpiarErrores);
        passwordInput.addEventListener('input', limpiarErrores);
    }

    /**
     * Mostrar mensaje de error
     */
    function mostrarError(mensaje) {
        // Verificar si ya existe un error de validación
        const errorExistente = document.querySelector('.alert-error');
        if (errorExistente && errorExistente.querySelector('span').textContent.includes(mensaje)) {
            return; // No duplicar errores iguales
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-error alert-dismissible fade show';
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${mensaje}</span>
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        `;

        // Buscar el contenedor de alertas
        const alertsContainer = document.querySelector('.login-alerts');
        if (alertsContainer) {
            alertsContainer.appendChild(alertDiv);
        } else {
            loginForm.parentNode.insertBefore(alertDiv, loginForm);
        }

        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    /**
     * Limpiar mensajes de error
     */
    function limpiarErrores() {
        const alertas = document.querySelectorAll('.alert');
        alertas.forEach(alerta => {
            if (alerta.classList.contains('alert-error')) {
                alerta.remove();
            }
        });
    }

    // Re-activar botón si hay error de servidor
    if (submitBtn && submitBtn.textContent.includes('Verificando')) {
        setTimeout(() => {
            if (submitBtn.disabled) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
            }
        }, 3000);
    }
});
