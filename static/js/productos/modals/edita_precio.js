// ================================================================
// MODAL EDITAR PRECIO (ADMINISTRADOR) - CON NOTIFICACIONES
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
                mostrarNotificacion('Error al cargar los datos del producto', 'danger');
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
        const precioActual = $('#precio_actual').val();
        
        if (!precioNuevo || parseFloat(precioNuevo) < 0) {
            mostrarNotificacion('El precio debe ser un número válido', 'warning');
            $('#precio_nuevo').focus();
            return;
        }
        
        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', $('[name=csrfmiddlewaretoken]').val());
        formData.append('precio_unidad', precioNuevo);
        
        // Desactivar botón mientras se procesa
        const btnSubmit = $('#formEditarPrecio button[type="submit"]');
        const textoOriginal = btnSubmit.html();
        btnSubmit.prop('disabled', true).html('<span class="spinner-border spinner-border-sm mr-2"></span>Guardando...');
        
        $.ajax({
            url: `/productos/${productoId}/editar-precio/`,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function(response) {
                btnSubmit.prop('disabled', false).html(textoOriginal);
                
                // Cerrar modal
                $('#modalEditarPrecio').modal('hide');
                
                // Mostrar notificación
                mostrarNotificacion(
                    `Precio actualizado: $${precioActual} → $${precioNuevo}`,
                    'success',
                    4000
                );
                
                // Recargar tabla
                setTimeout(function() {
                    location.reload();
                }, 1500);
            },
            error: function(xhr) {
                btnSubmit.prop('disabled', false).html(textoOriginal);
                
                let mensaje = 'Error al actualizar el precio';
                if (xhr.status === 403) {
                    mensaje = 'No tienes permisos para editar precios';
                } else if (xhr.responseJSON && xhr.responseJSON.error) {
                    mensaje = xhr.responseJSON.error;
                }
                
                mostrarNotificacion(mensaje, 'danger');
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
