// ================================================================
// MODAL EDITAR PRECIO (ADMINISTRADOR)
// ================================================================

(function() {
    'use strict';
    
    window.inicializarModalEditarPrecio = function() {
        // Manejar clic en botón editar precio
        $(document).on('click', '.btn-editar-precio', function() {
            const productoId = $(this).data('producto-id');
            cargarProductoParaEditarPrecio(productoId);
        });
        
        // Manejar submit del formulario
        $(document).on('submit', '#formEditarPrecio', function(e) {
            e.preventDefault();
            const productoId = $(this).data('producto-id');
            guardarPrecio(productoId);
        });
        
        // Limpiar cuando se cierra el modal
        $('#modalEditarPrecio').on('hidden.bs.modal', function() {
            limpiarFormularioPrecio();
        });
        
        console.log('✓ Modal Editar Precio inicializado');
    };
    
    function cargarProductoParaEditarPrecio(productoId) {
        const url = `/productos/${productoId}/obtener/`;
        
        $.ajax({
            url: url,
            type: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function(data) {
                llenarFormularioPrecio(data, productoId);
                $('#modalEditarPrecio').modal('show');
            },
            error: function(xhr) {
                alert('Error al cargar los datos del producto');
                console.error(xhr);
            }
        });
    }
    
    function llenarFormularioPrecio(data, productoId) {
        $('#precio_producto').val(`${data.codigo} - ${data.nombre}`);
        $('#precio_actual').val(parseFloat(data.precio_unidad).toFixed(2));
        $('#precio_nuevo').val(parseFloat(data.precio_unidad).toFixed(2));
        
        // Guardar ID en el formulario
        $('#formEditarPrecio').data('producto-id', productoId);
    }
    
    function guardarPrecio(productoId) {
        const precioNuevo = $('#precio_nuevo').val();
        
        if (!precioNuevo || parseFloat(precioNuevo) < 0) {
            alert('El precio debe ser un número válido');
            $('#precio_nuevo').focus();
            return;
        }
        
        const url = `/productos/${productoId}/editar/`;
        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', $('[name=csrfmiddlewaretoken]').val());
        formData.append('precio_unidad', precioNuevo);
        
        // Desactivar botón mientras se procesa
        const $btn = $(this).find('button[type="submit"]');
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Guardando...');
        
        $.ajax({
            url: url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function(response) {
                // Cerrar modal
                $('#modalEditarPrecio').modal('hide');
                
                // Mostrar mensaje de éxito
                alert('Precio actualizado correctamente');
                
                // Recargar la página
                location.reload();
            },
            error: function(xhr) {
                // Reactivar botón
                $btn.prop('disabled', false).html('<i class="fas fa-save"></i> Guardar Precio');
                
                // Mostrar error
                console.error('Error:', xhr);
                if (xhr.status === 403) {
                    alert('No tienes permisos para editar precios');
                } else {
                    alert('Error al actualizar el precio');
                }
            }
        });
    }
    
    function limpiarFormularioPrecio() {
        $('#formEditarPrecio')[0].reset();
        $('#precio_producto').val('');
        $('#precio_actual').val('');
        $('#precio_nuevo').val('');
    }
})();
