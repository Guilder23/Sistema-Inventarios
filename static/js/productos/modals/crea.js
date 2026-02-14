// ================================================================
// MODAL CREAR PRODUCTO - VERSIÓN SIMPLIFICADA Y ROBUSTA
// ================================================================

(function() {
    'use strict';
    
    window.inicializarModalCrear = function() {
        // Limpiar cuando se cierra el modal
        $('#modalCrearProducto').on('hidden.bs.modal', function() {
            limpiarFormulario();
        });
        
        // Manejar submit del formulario
        $(document).on('submit', '#formCrearProducto', function(e) {
            if (!validarFormulario()) {
                e.preventDefault();
                return false;
            }
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
    
    function validarFormulario() {
        const codigo = $('#codigo').val().trim();
        const nombre = $('#nombre').val().trim();
        const stock = $('#stock').val();
        const unidades_por_caja = $('#unidades_por_caja').val();
        const precio_unidad = $('#precio_unidad').val();
        
        if (!codigo) {
            alert('El código del producto es requerido');
            $('#codigo').focus();
            return false;
        }
        
        if (!nombre) {
            alert('El nombre del producto es requerido');
            $('#nombre').focus();
            return false;
        }
        
        if (!stock || parseInt(stock) < 0) {
            alert('El stock debe ser un número válido');
            $('#stock').focus();
            return false;
        }
        
        if (!unidades_por_caja || parseInt(unidades_por_caja) < 1) {
            alert('Las unidades por caja deben ser al menos 1');
            $('#unidades_por_caja').focus();
            return false;
        }
        
        if (!precio_unidad || parseFloat(precio_unidad) < 0) {
            alert('El precio unitario debe ser un número válido');
            $('#precio_unidad').focus();
            return false;
        }
        
        return true;
    }
    
    function limpiarFormulario() {
        $('#formCrearProducto')[0].reset();
        $('#foto').next('.custom-file-label').text('Seleccionar archivo');
    }
})();
