/* ============================================================================
   FUNCIONALIDAD PARA MODAL ELIMINAR USUARIO
   ============================================================================ */

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
