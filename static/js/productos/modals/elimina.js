// ================================================================
// MODAL ELIMINAR PRODUCTO
// ================================================================

(function() {
    'use strict';
    
    let productoIdAEliminar = null;
    
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
        });
        
        console.log('✓ Modal Eliminar Producto inicializado');
    };
    
    function mostrarModalEliminar(productoId, productoNombre) {
        productoIdAEliminar = productoId;
        $('#nombreProductoEliminar').text(productoNombre);
        $('#modalEliminarProducto').modal('show');
    }
    
    function confirmarEliminar(productoId) {
        const url = `/productos/${productoId}/eliminar/`;
        
        // Desactivar botón mientras se procesa
        $('#btnConfirmarEliminar').prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Eliminando...');
        
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
                
                // Mostrar mensaje de éxito
                alert('Producto eliminado correctamente');
                
                // Recargar la página
                location.reload();
            },
            error: function(xhr) {
                // Reactivar botón
                $('#btnConfirmarEliminar').prop('disabled', false).html('<i class="fas fa-trash"></i> Sí, Eliminar');
                
                // Mostrar error
                console.error('Error:', xhr);
                if (xhr.status === 403) {
                    alert('No tienes permisos para eliminar este producto');
                } else {
                    alert('Error al eliminar el producto');
                }
            }
        });
    }
})();
