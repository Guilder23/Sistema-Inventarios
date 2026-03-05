/**
 * Gestión del modal para ver detalles de devoluciones
 */

$(document).ready(function() {
    inicializarModalVerDevolucion();
});

function inicializarModalVerDevolucion() {
    // Manejar clic en botón Ver
    $(document).on('click', '.btn-ver-devolucion', function() {
        const devolucionId = $(this).data('id');
        const url = $(this).data('url');
        
        if (!devolucionId || !url) {
            console.error('Faltan datos de la devolución');
            return;
        }
        
        cargarDetallesDevolucion(url);
    });
    
    // Limpiar modal al cerrar
    $('#modalVerDevolucion').on('hidden.bs.modal', function() {
        limpiarModalVerDevolucion();
    });
}

function cargarDetallesDevolucion(url) {
    // Mostrar loading
    mostrarCargandoDevolucion();
    
    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                llenarModalVerDevolucion(response.devolucion);
                $('#modalVerDevolucion').modal('show');
            } else {
                console.error('Error:', response.error);
                alert('Error al cargar los detalles: ' + response.error);
            }
        },
        error: function(xhr, status, error) {
            console.error('Error al cargar detalles:', error);
            alert('Error al cargar los detalles de la devolución');
        }
    });
}

function llenarModalVerDevolucion(devolucion) {
    // Información del Producto
    $('#verNombreProductoDev').text(devolucion.producto.nombre);
    $('#verCategoriaProductoDev').text(devolucion.producto.categoria);
    $('#verStockProductoDev').text(devolucion.producto.stock_actual);
    
    // Código del producto
    $('#verCodigoDisplayDev').html('<span class="codigo-devolucion-badge">' + devolucion.producto.codigo + '</span>');
    
    // Foto del producto
    if (devolucion.producto.foto) {
        $('#verFotoProductoDev').attr('src', devolucion.producto.foto);
        $('#verFotoProductoDevContainer').show();
        $('#verFotoProductoDevPlaceholder').hide();
    } else {
        $('#verFotoProductoDevContainer').hide();
        $('#verFotoProductoDevPlaceholder').show();
    }
    
    // Cantidades
    $('#verCantidadDevuelta').text(devolucion.cantidad_devuelta);
    $('#verCantidadRecuperadaDev').text(devolucion.cantidad_recuperada);
    $('#verCantidadRepuestaDev').text(devolucion.cantidad_repuesta);
    $('#verCantidadPendienteDev').text(devolucion.cantidad_pendiente);
    
    // Estado
    $('#verEstadoDevolucion').html(obtenerBadgeEstadoDevolucion(devolucion.estado));
    
    // Detalles
    $('#verComentarioDev').text(devolucion.comentario);
    $('#verFechaRegistroDev').text(devolucion.fecha_registro);
    
    // Foto de la devolución
    if (devolucion.foto) {
        $('#verFotoDevolucion').attr('src', devolucion.foto);
        $('#verFotoDevolucionContainer').show();
        $('#verFotoDevolucionPlaceholder').hide();
    } else {
        $('#verFotoDevolucionContainer').hide();
        $('#verFotoDevolucionPlaceholder').show();
    }
    
    // Información de Registro
    $('#verUbicacionDev').text(devolucion.ubicacion.nombre + ' (' + devolucion.ubicacion.rol + ')');
    $('#verRegistradoPorDev').text(devolucion.registrado_por.nombre);
}

function obtenerBadgeEstadoDevolucion(estado) {
    const badges = {
        'Pendiente': '<span class="badge-estado-devolucion badge-estado-pendiente-dev">Pendiente</span>',
        'Parcial': '<span class="badge-estado-devolucion badge-estado-parcial-dev">Parcial</span>',
        'Cerrado': '<span class="badge-estado-devolucion badge-estado-cerrado-dev">Cerrado</span>'
    };
    return badges[estado] || '<span class="badge-estado-devolucion">' + estado + '</span>';
}

function mostrarCargandoDevolucion() {
    // Limpiar y mostrar loading en campos principales
    $('#verNombreProductoDev').html('<i class="fas fa-spinner fa-spin"></i> Cargando...');
    $('#verCategoriaProductoDev').text('...');
    $('#verStockProductoDev').text('...');
    $('#verCodigoDisplayDev').html('<span class="codigo-devolucion-badge">...</span>');
}

function limpiarModalVerDevolucion() {
    // Limpiar todos los campos
    $('#verNombreProductoDev').text('-');
    $('#verCategoriaProductoDev').text('-');
    $('#verStockProductoDev').text('0');
    $('#verCodigoDisplayDev').html('');
    $('#verCantidadDevuelta').text('0');
    $('#verCantidadRecuperadaDev').text('0');
    $('#verCantidadRepuestaDev').text('0');
    $('#verCantidadPendienteDev').text('0');
    $('#verEstadoDevolucion').html('');
    $('#verFechaRegistroDev').text('-');
    $('#verComentarioDev').text('-');
    $('#verUbicacionDev').text('-');
    $('#verRegistradoPorDev').text('-');
    
    // Limpiar imágenes
    $('#verFotoProductoDev').attr('src', '');
    $('#verFotoDevolucion').attr('src', '');
    $('#verFotoProductoDevContainer').hide();
    $('#verFotoProductoDevPlaceholder').hide();
    $('#verFotoDevolucionContainer').hide();
    $('#verFotoDevolucionPlaceholder').hide();
}
