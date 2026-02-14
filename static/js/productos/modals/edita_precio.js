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
        
        // Llenar todos los campos de precios
        $('#precio_unitario').val(parseFloat(data.precio_unidad).toFixed(2));
        $('#precio_compra').val(parseFloat(data.precio_compra).toFixed(2));
        $('#precio_caja').val(parseFloat(data.precio_caja).toFixed(2));
        $('#precio_mayor').val(parseFloat(data.precio_mayor).toFixed(2));
        $('#poliza').val(parseFloat(data.poliza).toFixed(2));
        $('#gastos').val(parseFloat(data.gastos).toFixed(2));
        
        // Guardar ID en el formulario
        $('#formEditarPrecio').data('producto-id', productoId);
    }
    
    function guardarPrecio(productoId) {
        const precioUnitario = $('#precio_unitario').val();
        const precioCompra = $('#precio_compra').val();
        const precioCaja = $('#precio_caja').val();
        const precioMayor = $('#precio_mayor').val();
        const poliza = $('#poliza').val();
        const gastos = $('#gastos').val();
        
        if (!precioUnitario || parseFloat(precioUnitario) < 0) {
            mostrarNotificacion('El precio unitario debe ser un número válido', 'warning');
            $('#precio_unitario').focus();
            return;
        }
        
        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', $('[name=csrfmiddlewaretoken]').val());
        formData.append('precio_unidad', precioUnitario);
        formData.append('precio_compra', precioCompra || 0);
        formData.append('precio_caja', precioCaja || 0);
        formData.append('precio_mayor', precioMayor || 0);
        formData.append('poliza', poliza || 0);
        formData.append('gastos', gastos || 0);
        
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
                    'Precios actualizados correctamente',
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
                
                let mensaje = 'Error al actualizar los precios';
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
        $('#precio_unitario').val('');
        $('#precio_compra').val('');
        $('#precio_caja').val('');
        $('#precio_mayor').val('');
        $('#poliza').val('');
        $('#gastos').val('');
    }
})();
