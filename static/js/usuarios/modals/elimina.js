// ==========================================
// MODAL ELIMINAR/BLOQUEAR USUARIO
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarModalEliminar();
});

function inicializarModalEliminar() {
    const botonesEliminar = document.querySelectorAll('.btn-eliminar-usuario');
    botonesEliminar.forEach(btn => {
        btn.addEventListener('click', function() {
            const usuarioId = this.getAttribute('data-usuario-id');
            const usuarioNombre = this.getAttribute('data-usuario-nombre');
            cargarEliminacionUsuario(usuarioId, usuarioNombre);
        });
    });
    
    const formEliminar = document.getElementById('formEliminarUsuario');
    if (formEliminar) {
        formEliminar.addEventListener('submit', function(e) {
            e.preventDefault();
            if (confirm('¿Desea bloquear este usuario?')) {
                this.submit();
            }
        });
    }
}

function cargarEliminacionUsuario(usuarioId, nombreUsuario) {
    const usuarioIdInput = document.getElementById('eliminarUsuarioId');
    const usuarioNombreSpan = document.getElementById('eliminarUsuarioNombre');
    
    if (usuarioIdInput) {
        usuarioIdInput.value = usuarioId;
    }
    
    if (usuarioNombreSpan) {
        usuarioNombreSpan.textContent = nombreUsuario;
    }

    // Actualizar action del formulario
    const formEliminar = document.getElementById('formEliminarUsuario');
    if (formEliminar) {
        formEliminar.action = `/usuarios/${usuarioId}/bloquear/`;
    }
}
