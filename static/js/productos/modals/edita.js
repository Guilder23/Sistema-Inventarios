// ================================================================
// MODAL EDITAR PRODUCTO - CON NOTIFICACIONES INTEGRADAS
// ================================================================

(function() {
    'use strict';
    
    window.inicializarModalEditar = function() {
        // Manejar clic en botón editar
        $(document).on('click', '.btn-editar-producto', function() {
            const productoId = $(this).data('producto-id');
            cargarProductoParaEditar(productoId);
        });
        
        // Manejar submit con AJAX
        $(document).on('submit', '#formEditarProducto', function(e) {
            e.preventDefault();
            
            if (!validarFormularioEditar()) {
                return false;
            }
            
            const productoId = $(this).data('producto-id');
            editarProductoAJAX(productoId);
        });
        
        // Mostrar nombre del archivo seleccionado
        $('#edit_foto').on('change', function() {
            const fileName = this.files[0]?.name || 'Seleccionar archivo';
            $(this).next('.custom-file-label').text(fileName);
            
            // Mostrar preview
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#previewFotoEditar').html(`<img src="${e.target.result}" alt="preview" class="img-fluid" style="max-width: 100%; max-height: 250px; object-fit: cover; border: 2px solid #e5e7eb; border-radius: 4px;">`);
            };
            reader.readAsDataURL(this.files[0]);
        });
        
        // Limpiar cuando se cierra el modal
        $('#modalEditarProducto').on('hidden.bs.modal', function() {
            limpiarFormularioEditar();
        });
        
        console.log('✓ Modal Editar Producto inicializado');
    };
    
    function cargarProductoParaEditar(productoId) {
        const url = `/productos/${productoId}/obtener/`;
        
        $.ajax({
            url: url,
            type: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function(data) {
                llenarFormularioEditar(data, productoId);
            },
            error: function(xhr) {
                mostrarNotificacion('Error al cargar los datos del producto', 'danger');
            }
        });
    }
    
    function llenarFormularioEditar(data, productoId) {
        $('#edit_codigo').val(data.codigo);
        $('#edit_nombre').val(data.nombre);
        $('#edit_descripcion').val(data.descripcion);
        $('#edit_stock').val(data.stock);
        $('#edit_unidades_por_caja').val(data.unidades_por_caja);
        $('#edit_precio_unidad').val(data.precio_unidad);
        $('#edit_stock_critico').val(data.stock_critico);
        $('#edit_stock_bajo').val(data.stock_bajo);
        $('#edit_activo').prop('checked', data.activo);
        
        // Mostrar preview de foto
        if (data.foto) {
            $('#previewFotoEditar').html(`<img src="${data.foto}" alt="producto" class="img-fluid" style="max-width: 100%; max-height: 250px; object-fit: cover; border: 2px solid #e5e7eb; border-radius: 4px;">`);
        } else {
            $('#previewFotoEditar').html('');
        }
        
        // Resetear etiqueta de archivo
        $('#edit_foto').next('.custom-file-label').text('Seleccionar archivo');
        
        // Guardar ID en el formulario
        $('#formEditarProducto').data('producto-id', productoId);
        
        // Mostrar modal
        $('#modalEditarProducto').modal('show');
    }
    
    function editarProductoAJAX(productoId) {
        const form = $('#formEditarProducto')[0];
        const formData = new FormData(form);
        const nombreProducto = $('#edit_nombre').val();
        
        // Deshabilitar botón submit
        const btnSubmit = $('#formEditarProducto button[type="submit"]');
        const textoOriginal = btnSubmit.html();
        btnSubmit.prop('disabled', true).html('<span class="spinner-border spinner-border-sm mr-2"></span>Guardando...');
        
        $.ajax({
            url: `/productos/${productoId}/editar/`,
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function(response) {
                btnSubmit.prop('disabled', false).html(textoOriginal);
                
                // Cerrar modal
                $('#modalEditarProducto').modal('hide');
                
                // Mostrar notificación
                mostrarNotificacion(
                    `Producto "${nombreProducto}" actualizado exitosamente`,
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
                
                let mensaje = 'Error al actualizar producto';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    mensaje = xhr.responseJSON.error;
                }
                
                mostrarNotificacion(mensaje, 'danger');
            }
        });
    }
    
    function validarFormularioEditar() {
        const codigo = $('#edit_codigo').val().trim();
        const nombre = $('#edit_nombre').val().trim();
        const stock = $('#edit_stock').val();
        const unidades_por_caja = $('#edit_unidades_por_caja').val();
        const precio_unidad = $('#edit_precio_unidad').val();
        
        if (!codigo) {
            mostrarNotificacion('El código del producto es requerido', 'warning');
            $('#edit_codigo').focus();
            return false;
        }
        
        if (!nombre) {
            mostrarNotificacion('El nombre del producto es requerido', 'warning');
            $('#edit_nombre').focus();
            return false;
        }
        
        if (!stock || parseInt(stock) < 0) {
            mostrarNotificacion('El stock debe ser un número válido', 'warning');
            $('#edit_stock').focus();
            return false;
        }
        
        if (!unidades_por_caja || parseInt(unidades_por_caja) < 1) {
            mostrarNotificacion('Las unidades por caja deben ser al menos 1', 'warning');
            $('#edit_unidades_por_caja').focus();
            return false;
        }
        
        if (!precio_unidad || parseFloat(precio_unidad) < 0) {
            mostrarNotificacion('El precio unitario debe ser un número válido', 'warning');
            $('#edit_precio_unidad').focus();
            return false;
        }
        
        return true;
    }
    
    function limpiarFormularioEditar() {
        $('#formEditarProducto')[0].reset();
        $('#edit_foto').next('.custom-file-label').text('Seleccionar archivo');
        $('#previewFotoEditar').html('');
    }
})();
