// ==========================================
// MODAL CREAR USUARIO
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarModalCrear();
});

function inicializarModalCrear() {
    const formCrear = document.getElementById('formCrearUsuario');
    
    if (formCrear) {
        formCrear.addEventListener('submit', function(e) {
            if (!validarFormularioCrear()) {
                e.preventDefault();
                return false;
            }
            return true;
        });

        // Mostrar campo de ubicación según rol seleccionado
        const rolSelect = document.getElementById('rol');
        const grupoUbicacion = document.getElementById('grupoUbicacion');
        const nombreUbicacion = document.getElementById('nombre_ubicacion');

        if (rolSelect && grupoUbicacion) {
            rolSelect.addEventListener('change', function() {
                const rolesConUbicacion = ['almacen', 'tienda', 'deposito', 'tienda_online'];
                if (rolesConUbicacion.includes(this.value)) {
                    grupoUbicacion.style.display = 'block';
                } else {
                    grupoUbicacion.style.display = 'none';
                    nombreUbicacion.required = false;
                    nombreUbicacion.value = '';
                }
            });
        }

        // Validación en tiempo real
        const username = document.getElementById('username');
        if (username) {
            username.addEventListener('blur', function() {
                if (this.value.length < 3) {
                    this.classList.add('is-invalid');
                } else {
                    this.classList.remove('is-invalid');
                }
            });
        }

        const password = document.getElementById('password');
        const password2 = document.getElementById('password2');
        
        if (password && password2) {
            password2.addEventListener('input', function() {
                if (this.value !== password.value) {
                    this.classList.add('is-invalid');
                    this.setCustomValidity('Las contraseñas no coinciden');
                } else {
                    this.classList.remove('is-invalid');
                    this.setCustomValidity('');
                }
            });

            password.addEventListener('input', function() {
                if (this.value.length < 8) {
                    this.classList.add('is-invalid');
                } else {
                    this.classList.remove('is-invalid');
                }
                if (password2.value) {
                    password2.dispatchEvent(new Event('input'));
                }
            });
        }
    }
    
    // Limpiar formulario cuando se cierre
    jQuery('#modalCrearUsuario').on('hidden.bs.modal', function() {
        const form = document.getElementById('formCrearUsuario');
        if (form) {
            form.reset();
        }
    });
}

function validarFormularioCrear() {
    const username = document.getElementById('username')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value.trim();
    const password2 = document.getElementById('password2')?.value.trim();
    const rol = document.getElementById('rol')?.value;

    if (!username || !email || !password || !password2 || !rol) {
        alert('Por favor complete todos los campos requeridos');
        return false;
    }

    if (username.length < 3) {
        alert('El usuario debe tener al menos 3 caracteres');
        return false;
    }

    if (!validarEmail(email)) {
        alert('Correo electrónico inválido');
        return false;
    }

    if (password.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres');
        return false;
    }

    if (password !== password2) {
        alert('Las contraseñas no coinciden');
        return false;
    }

    return true;
}

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}
