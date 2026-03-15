// ================================================================
// MODAL ELIMINAR USUARIO - VERSIÓN SIMPLIFICADA
// ================================================================

console.log('✓ Script elimina.js cargado');

(function() {
    'use strict';
    
    let usuarioIdEliminar = null;
    
    // Esperar a que jQuery esté listo
    $(document).ready(function() {
        console.log('✓ jQuery ready en elimina.js');
        
        // Delegación de eventos para botones de eliminar (dinámicos)
        $(document).on('click', '.btn-eliminar-usuario', function(e) {
            e.preventDefault();
            const userId = $(this).data('usuario-id');
            const username = $(this).data('usuario-nombre');
            console.log('→ Solicitando eliminación del usuario ID:', userId, 'Username:', username);
            
            usuarioIdEliminar = userId;
            $('#eliminarUsuarioNombre').text(username);
            $('#modalEliminarUsuario').modal('show');
        });
        
        // Confirmar eliminación mediante submit del formulario
        $('#formEliminarUsuario').off('submit').on('submit', function(e) {
            if (usuarioIdEliminar) {
                console.log('→ Confirmando eliminación usuario ID:', usuarioIdEliminar);
                const form = $(this);
                form.attr('action', `/usuarios/${usuarioIdEliminar}/eliminar/`);
            }
        });
    });
    
})();
