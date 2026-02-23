// ================================================================
// MODAL CREAR PRODUCTO - VERSIÓN CON NOTIFICACIONES INTEGRADAS
// ================================================================

(function() {
    'use strict';
    
    window.inicializarModalCrear = function() {
        // Limpiar cuando se cierra el modal
        $('#modalCrearProducto').on('hidden.bs.modal', function() {
            limpiarFormulario();
        });
        
        // Manejar submit con AJAX
        $(document).on('submit', '#formCrearProducto', function(e) {
            e.preventDefault();
            
            if (!validarFormulario()) {
                return false;
            }
            
            crearProductoAJAX();
        });
        
        // Mostrar nombre del archivo seleccionado
        $('#foto').on('change', function() {
            const fileName = this.files[0]?.name || 'Seleccionar archivo';
            $(this).next('.custom-file-label').text(fileName);
            
            // Mostrar preview
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#previewFoto').html(`<img src="${e.target.result}" alt="preview" class="img-fluid" style="max-width: 100%; max-height: 250px; object-fit: cover; border: 2px solid #e5e7eb; border-radius: 4px;">`);
            };
            if (this.files[0]) {
                reader.readAsDataURL(this.files[0]);
            }
        });
        
        console.log('✓ Modal Crear Producto inicializado');
    };
    
    function crearProductoAJAX() {
        const form = $('#formCrearProducto')[0];
        const formData = new FormData(form);
        const nombreProducto = $('#nombre').val();
        
        // Deshabilitar botón submit
        const btnSubmit = $('#formCrearProducto button[type="submit"]');
        const textoOriginal = btnSubmit.html();
        btnSubmit.prop('disabled', true).html('<span class="spinner-border spinner-border-sm mr-2"></span>Guardando...');
        
        $.ajax({
            url: $('#formCrearProducto').attr('action'),
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function(response) {
                btnSubmit.prop('disabled', false).html(textoOriginal);
                
                // Cerrar modal
                $('#modalCrearProducto').modal('hide');
                
                // Mostrar notificación
                mostrarNotificacion(
                    `Producto "${nombreProducto}" creado exitosamente`,
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
                
                let mensaje = 'Error al crear producto';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    mensaje = xhr.responseJSON.error;
                }
                
                mostrarNotificacion(mensaje, 'danger');
            }
        });
    }
    
    function validarFormulario() {
        const codigo = $('#codigo').val().trim();
        const nombre = $('#nombre').val().trim();
        const stock = $('#stock').val();
        const unidades_por_caja = $('#unidades_por_caja').val();
        const precio_unidad = $('#precio_unidad').val();
        
        if (!codigo) {
            mostrarNotificacion('El código del producto es requerido', 'warning');
            $('#codigo').focus();
            return false;
        }
        
        if (!nombre) {
            mostrarNotificacion('El nombre del producto es requerido', 'warning');
            $('#nombre').focus();
            return false;
        }
        
        if (!stock || parseInt(stock) < 0) {
            mostrarNotificacion('El stock debe ser un número válido', 'warning');
            $('#stock').focus();
            return false;
        }
        
        if (!unidades_por_caja || parseInt(unidades_por_caja) < 1) {
            mostrarNotificacion('Las unidades por caja deben ser al menos 1', 'warning');
            $('#unidades_por_caja').focus();
            return false;
        }
        
        if (!precio_unidad || parseFloat(precio_unidad) < 0) {
            mostrarNotificacion('El precio unitario debe ser un número válido', 'warning');
            $('#precio_unidad').focus();
            return false;
        }
        
        return true;
    }
    
    function limpiarFormulario() {
        $('#formCrearProducto')[0].reset();
        $('#foto').next('.custom-file-label').text('Seleccionar archivo');
        $('#previewFoto').html('');
    }
})();
