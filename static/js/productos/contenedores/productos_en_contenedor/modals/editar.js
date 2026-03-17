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
    function abrirModalEditarProductoContenedor(pcId, cantidadActual, codigoProducto, nombreProducto, cantidadRecibida) {
        console.log('Abriendo modal editar con ID:', pcId);
        document.getElementById('pc_id_edit').value = pcId;
        document.getElementById('cantidadActualEdit').textContent = cantidadActual;
        document.getElementById('cantidadRecibidaEdit').value = cantidadRecibida || cantidadActual;
        document.getElementById('cantidadRecibidaDisplayEdit').textContent = cantidadRecibida || cantidadActual;
        document.getElementById('cantidadCambioEdit').value = 1;
        document.getElementById('productoNombreEdit').textContent = codigoProducto + ' - ' + nombreProducto;
        
        // Seleccionar operación SUMAR por defecto
        document.getElementById('operacionSumar').checked = true;
        document.getElementById('operacionTextoEdit').textContent = 'Sumar';
        
        // Calcular resultado inicial
        calcularResultado();
        
        $('#modalEditarProductoContenedor').modal('show');
    }
    
    // Calcular resultado de la operación
    function calcularResultado() {
        const cantidadRecibida = parseInt(document.getElementById('cantidadRecibidaEdit').value) || 0;
        const cantidadActual = parseInt(document.getElementById('cantidadActualEdit').textContent) || 0;
        const cantidadCambio = parseInt(document.getElementById('cantidadCambioEdit').value) || 0;
        const operacion = document.querySelector('input[name="operacion"]:checked').value;
        
        let nuevaRecibida, nuevaDisponible;
        
        if (operacion === 'sumar') {
            nuevaRecibida = cantidadRecibida + cantidadCambio;
            nuevaDisponible = cantidadActual + cantidadCambio;
        } else {
            nuevaRecibida = Math.max(0, cantidadRecibida - cantidadCambio);
            nuevaDisponible = Math.max(0, cantidadActual - cantidadCambio);
        }
        
        document.getElementById('resultadoRecibidaEdit').textContent = nuevaRecibida + ' unidades';
        document.getElementById('resultadoDisponibleEdit').textContent = nuevaDisponible + ' unidades';
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
            const cantidadRecibida = $(this).data('cantidad-recibida');
            const codigoProducto = $(this).data('codigo');
            const nombreProducto = $(this).data('nombre');
            abrirModalEditarProductoContenedor(pcId, cantidadActual, codigoProducto, nombreProducto, cantidadRecibida);
        });
        
        // Cambio de operación
        $(document).on('change', 'input[name="operacion"]', function() {
            const operacion = $(this).val();
            const textoOperacion = operacion === 'sumar' ? 'Sumar' : 'Restar';
            $('#operacionTextoEdit').text(textoOperacion);
            calcularResultado();
        });
        
        // Cambio en cantidad
        $(document).on('change keyup', '#cantidadCambioEdit', function() {
            calcularResultado();
        });
        
        // Envío de formulario - Editar cantidad
        $('#formEditarProductoContenedor').on('submit', function(e) {
            e.preventDefault();
            
            const pcId = $('#pc_id_edit').val();
            const cantidadCambio = $('#cantidadCambioEdit').val();
            const operacion = $('input[name="operacion"]:checked').val();
            
            if (!pcId || !cantidadCambio) {
                alert('Error: Datos incompletos');
                return;
            }
            
            const url = `/productos/producto-contenedor/${pcId}/editar/`;
            
            $.ajax({
                type: 'POST',
                url: url,
                data: {
                    cantidad_cambio: cantidadCambio,
                    operacion: operacion,
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
