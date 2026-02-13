/* ============================================================================
   FUNCIONALIDAD PARA MODAL EDITAR USUARIO
   ============================================================================ */

async function cargarEdicionUsuario(usuarioId) {
    try {
        const response = await fetch(`/usuarios/${usuarioId}/editar/`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        const data = await response.json();

        // Rellenar el modal con los datos del usuario
        document.getElementById('editarUsuarioId').value = data.id;
        document.getElementById('editUsername').value = data.username;
        document.getElementById('editEmail').value = data.email;
        document.getElementById('editFirstName').value = data.first_name;
        document.getElementById('editLastName').value = data.last_name;
        document.getElementById('editIsActive').checked = data.is_active;
        
        // Limpiar contraseña
        document.getElementById('editPassword').value = '';
        
        // Cargar rol si existe
        if (data.rol) {
            document.getElementById('editRol').value = data.rol;
        }
        
        // Actualizar action del formulario
        const formEditar = document.getElementById('formEditarUsuario');
        if (formEditar) {
            formEditar.action = `/usuarios/${usuarioId}/editar/`;
        }
    } catch (error) {
        console.error('Error al cargar datos de edición:', error);
        alert('Error al cargar los datos del usuario');
    }
}

function validarFormularioEditarUsuario() {
    const email = document.getElementById('editEmail')?.value.trim();
    const password = document.getElementById('editPassword')?.value.trim();

    if (!email) {
        return false;
    }

    if (!validarEmail(email)) {
        console.log('Email inválido');
        return false;
    }

    if (password && password.length < 8) {
        console.log('Contraseña debe tener al menos 8 caracteres');
        return false;
    }

    return true;
}

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}
