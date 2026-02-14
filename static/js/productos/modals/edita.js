// ================================================================
// MODAL EDITAR PRODUCTO
// ================================================================

(function() {
    'use strict';
    
    window.inicializarModalEditar = function() {
        // Manejar clic en botón editar
        $(document).on('click', '.btn-editar-producto', function() {
            const productoId = $(this).data('producto-id');
            cargarProductoParaEditar(productoId);
        });
        
        // Manejar submit del formulario
        $(document).on('submit', '#formEditarProducto', function(e) {
            if (!validarFormularioEditar()) {
                e.preventDefault();
                return false;
            }
            const productoId = $(this).data('producto-id');
            this.action = `/productos/${productoId}/editar/`;
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
                alert('Error al cargar los datos del producto');
                console.error(xhr);
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
    }
    
    function validarFormularioEditar() {
        const codigo = $('#edit_codigo').val().trim();
        const nombre = $('#edit_nombre').val().trim();
        const stock = $('#edit_stock').val();
        const unidades_por_caja = $('#edit_unidades_por_caja').val();
        const precio_unidad = $('#edit_precio_unidad').val();
        
        if (!codigo) {
            alert('El código del producto es requerido');
            $('#edit_codigo').focus();
            return false;
        }
        
        if (!nombre) {
            alert('El nombre del producto es requerido');
            $('#edit_nombre').focus();
            return false;
        }
        
        if (!stock || parseInt(stock) < 0) {
            alert('El stock debe ser un número válido');
            $('#edit_stock').focus();
            return false;
        }
        
        if (!unidades_por_caja || parseInt(unidades_por_caja) < 1) {
            alert('Las unidades por caja deben ser al menos 1');
            $('#edit_unidades_por_caja').focus();
            return false;
        }
        
        if (!precio_unidad || parseFloat(precio_unidad) < 0) {
            alert('El precio unitario debe ser un número válido');
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
