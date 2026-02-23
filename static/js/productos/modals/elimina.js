// ================================================================
// MODAL ELIMINAR PRODUCTO - CON NOTIFICACIONES
// ================================================================

(function() {
    'use strict';
    
    let productoIdAEliminar = null;
    let nombreProductoEliminar = null;
    
    window.inicializarModalEliminar = function() {
        // Manejar clic en botón eliminar
        $(document).on('click', '.btn-eliminar-producto', function() {
            const productoId = $(this).data('producto-id');
            const productoNombre = $(this).data('producto-nombre');
            mostrarModalEliminar(productoId, productoNombre);
        });
        
        // Manejar confirmación de eliminación
        $(document).on('click', '#btnConfirmarEliminar', function() {
            if (productoIdAEliminar) {
                confirmarEliminar(productoIdAEliminar);
            }
        });
        
        // Limpiar al cerrar modal
        $('#modalEliminarProducto').on('hidden.bs.modal', function() {
            productoIdAEliminar = null;
            nombreProductoEliminar = null;
        });
        
        console.log('✓ Modal Eliminar Producto inicializado');
    };
    
    function mostrarModalEliminar(productoId, productoNombre) {
        productoIdAEliminar = productoId;
        nombreProductoEliminar = productoNombre;
        $('#nombreProductoEliminar').text(productoNombre);
        $('#modalEliminarProducto').modal('show');
    }
    
    function confirmarEliminar(productoId) {
        const url = `/productos/${productoId}/eliminar/`;
        
        // Desactivar botón mientras se procesa
        const btnConfirmar = $('#btnConfirmarEliminar');
        btnConfirmar.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Eliminando...');
        
        $.ajax({
            url: url,
            type: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': $('[name=csrfmiddlewaretoken]').val()
            },
            success: function(response) {
                // Cerrar modal
                $('#modalEliminarProducto').modal('hide');
                
                // Mostrar notificación
                mostrarNotificacion(
                    `Producto "${nombreProductoEliminar}" eliminado correctamente`,
                    'success',
                    4000
                );
                
                // Recargar tabla
                setTimeout(function() {
                    location.reload();
                }, 1500);
            },
            error: function(xhr) {
                // Reactivar botón
                btnConfirmar.prop('disabled', false).html('<i class="fas fa-trash"></i> Sí, Eliminar');
                
                let mensaje = 'Error al eliminar el producto';
                if (xhr.status === 403) {
                    mensaje = 'No tienes permisos para eliminar este producto';
                }
                
                mostrarNotificacion(mensaje, 'danger');
            }
        });
    }
})();
