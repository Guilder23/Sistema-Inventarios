// ================================================================
// MODAL VER VENDEDOR
// ================================================================

(function() {
    'use strict';
    
    function inicializarModalVer() {
        console.log('✓ Inicializando Modal Ver Vendedor');
        
        $(document).on('click', '.btn-ver-vendedor', function(e) {
            e.preventDefault();
            const vendedorId = $(this).data('vendedor-id');
            cargarYMostrarVendedor(vendedorId);
        });
    }
    
    function cargarYMostrarVendedor(vendedorId) {
        $.ajax({
            url: `/vendedores/obtener/${vendedorId}/`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                $('#verNombre').text(data.nombre + ' ' + data.apellido);
                $('#verCedula').html('<code>' + data.cedula + '</code>');
                $('#verEmail').text(data.email || '—');
                $('#verTelefono').text(data.telefono || '—');
                $('#verDireccion').text(data.direccion || '—');
                
                // Ubicación
                const ubicacion = data.almacen_id ? 'Almacén' : 'Tienda';
                $('#verUbicacion').text(ubicacion + ': ' + (data.almacen_id ? 'Asignado' : data.tienda_id ? 'Asignado' : 'No asignado'));
                $('#verTipo').text(ubicacion);
                
                // Comisión
                $('#verComision').text(data.comision + '%');
                
                // Estado
                let estadoBadge = '';
                if (data.estado === 'activo') {
                    estadoBadge = '<span class="badge-estado badge-estado-activo"><i class="fas fa-check-circle"></i> Activo</span>';
                } else if (data.estado === 'inactivo') {
                    estadoBadge = '<span class="badge-estado badge-estado-inactivo"><i class="fas fa-times-circle"></i> Inactivo</span>';
                } else {
                    estadoBadge = '<span class="badge-estado badge-estado-suspendido"><i class="fas fa-exclamation-circle"></i> Suspendido</span>';
                }
                $('#verEstado').html(estadoBadge);
                
                $('#verCreadoPor').text(data.creado_por);
                $('#verFecha').text(data.fecha_creacion);
                
                $('#modalVerVendedor').modal('show');
            },
            error: function() {
                alert('Error al cargar los datos del vendedor');
            }
        });
    }
    
    // Exponer función para inicialización
    window.inicializarModalVer = inicializarModalVer;
    
})();
