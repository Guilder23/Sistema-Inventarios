// ================================================================
// MODAL EDITAR CANTIDAD DE PRODUCTO EN CONTENEDOR
// ================================================================

(function() {
    'use strict';
    
    console.log('✓ Modal Editar Producto a Contenedor iniciando...');
    
    // Función para obtener token CSRF
    function obtenerCSRFToken() {
        return $('[name=csrfmiddlewaretoken]').val() || '';
    }
    
    // Abrir modal de edición
    function abrirModalEditarProductoContenedor(pcId, cantidadActual, codigoProducto, nombreProducto) {
        console.log('Abriendo modal editar con ID:', pcId);
        document.getElementById('pc_id_edit').value = pcId;
        document.getElementById('cantidadActualEdit').textContent = cantidadActual;
        document.getElementById('cantidadNuevaEdit').value = cantidadActual;
        document.getElementById('productoNombreEdit').textContent = codigoProducto + ' - ' + nombreProducto;
        document.getElementById('diferenciaEdit').textContent = '0 unidades';
        document.getElementById('diferenciaEdit').className = 'badge badge-cambio-editar badge-cambio-editar-neutral';
        $('#modalEditarProductoContenedor').modal('show');
    }
    
    // Hacer accesible globalmente
    window.abrirModalEditarProductoContenedor = abrirModalEditarProductoContenedor;
    
    // Event listener con jQuery para botón editar
    $(document).ready(function() {
        // Abrir modal
        $(document).on('click', '.btn-editar-producto-contenedor', function(e) {
            e.preventDefault();
            const pcId = $(this).data('pc-id');
            const cantidadActual = $(this).data('cantidad');
            const codigoProducto = $(this).data('codigo');
            const nombreProducto = $(this).data('nombre');
            abrirModalEditarProductoContenedor(pcId, cantidadActual, codigoProducto, nombreProducto);
        });
        
        // Calcular diferencia cuando cambia cantidad
        $(document).on('change keyup', '#cantidadNuevaEdit', function() {
            const cantidadActualText = document.getElementById('cantidadActualEdit').textContent;
            const cantidadActual = parseInt(cantidadActualText) || 0;
            const cantidadNueva = parseInt($(this).val()) || 0;
            const diferencia = cantidadNueva - cantidadActual;
            const $badge = $('#diferenciaEdit');
            
            if (diferencia > 0) {
                $badge.removeClass().addClass('badge badge-cambio-editar badge-cambio-editar-positive');
                $badge.text('+' + diferencia + ' unidades');
            } else if (diferencia < 0) {
                $badge.removeClass().addClass('badge badge-cambio-editar badge-cambio-editar-negative');
                $badge.text(diferencia + ' unidades');
            } else {
                $badge.removeClass().addClass('badge badge-cambio-editar badge-cambio-editar-neutral');
                $badge.text('0 unidades');
            }
        });
        
        // Envío de formulario - Editar cantidad
        $('#formEditarProductoContenedor').on('submit', function(e) {
            e.preventDefault();
            
            const pcId = $('#pc_id_edit').val();
            const cantidadNueva = $('#cantidadNuevaEdit').val();
            
            if (!pcId || !cantidadNueva) {
                alert('Error: Datos incompletos');
                return;
            }
            
            const url = `/productos/producto-contenedor/${pcId}/editar/`;
            
            $.ajax({
                type: 'POST',
                url: url,
                data: {
                    cantidad: cantidadNueva,
                    csrfmiddlewaretoken: obtenerCSRFToken()
                },
                success: function(data) {
                    console.log('Respuesta edición:', data);
                    if (data.success) {
                        $('#modalEditarProductoContenedor').modal('hide');
                        alert(data.mensaje || 'Cantidad actualizada exitosamente');
                        setTimeout(() => location.reload(), 500);
                    } else {
                        alert('Error: ' + (data.error || 'No se pudo actualizar'));
                    }
                },
                error: function(error) {
                    console.error('Error de edición:', error);
                    alert('Error al actualizar: ' + error.status + ' ' + error.statusText);
                }
            });
        });
    });
    
    console.log('✓ Modal Editar Producto a Contenedor inicializado');
})();
