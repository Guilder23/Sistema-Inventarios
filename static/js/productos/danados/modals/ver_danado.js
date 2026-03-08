/**
 * Gestión del modal para ver detalles de productos dañados
 */

$(document).ready(function() {
    inicializarModalVerDanado();
});

function inicializarModalVerDanado() {
    // Manejar clic en botón Ver
    $(document).on('click', '.btn-ver-danado', function() {
        const danadoId = $(this).data('id');
        const url = $(this).data('url');
        
        if (!danadoId || !url) {
            console.error('Faltan datos del producto dañado');
            return;
        }
        
        cargarDetallesDanado(url);
    });
    
    // Limpiar modal al cerrar
    $('#modalVerDanado').on('hidden.bs.modal', function() {
        limpiarModalVerDanado();
    });
}

function cargarDetallesDanado(url) {
    // Mostrar loading
    mostrarCargandoDanado();
    
    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                llenarModalVerDanado(response.danado);
                $('#modalVerDanado').modal('show');
            } else {
                console.error('Error:', response.error);
                alert('Error al cargar los detalles: ' + response.error);
            }
        },
        error: function(xhr, status, error) {
            console.error('Error al cargar detalles:', error);
            alert('Error al cargar los detalles del producto dañado');
        }
    });
}

function llenarModalVerDanado(danado) {
    // Información del Producto
    $('#verNombreProducto').text(danado.producto.nombre);
    $('#verCategoriaProducto').text(danado.producto.categoria);
    $('#verStockProducto').text(danado.producto.stock_actual);
    
    // Código del producto
    $('#verCodigoDisplay').html('<span class="codigo-danado-badge">' + danado.producto.codigo + '</span>');
    
    // Foto del producto
    if (danado.producto.foto) {
        $('#verFotoProducto').attr('src', danado.producto.foto);
        $('#verFotoProductoContainer').show();
        $('#verFotoProductoPlaceholder').hide();
    } else {
        $('#verFotoProductoContainer').hide();
        $('#verFotoProductoPlaceholder').show();
    }
    
    // Cantidades
    $('#verCantidadDanada').text(danado.cantidad_danada);
    $('#verCantidadRecuperada').text(danado.cantidad_recuperada);
    $('#verCantidadRepuesta').text(danado.cantidad_repuesta);
    $('#verCantidadPendiente').text(danado.cantidad_pendiente);
    
    // Estado
    $('#verEstadoDanado').html(obtenerBadgeEstado(danado.estado));
    
    // Detalles
    $('#verComentario').text(danado.comentario);
    $('#verFechaRegistro').text(danado.fecha_registro);
    
    // Foto del daño
    if (danado.foto) {
        $('#verFotoDano').attr('src', danado.foto);
        $('#verFotoDanoContainer').show();
        $('#verFotoDanoPlaceholder').hide();
    } else {
        $('#verFotoDanoContainer').hide();
        $('#verFotoDanoPlaceholder').show();
    }
    
    // Información de Registro
    $('#verUbicacion').text(danado.ubicacion.nombre + ' (' + danado.ubicacion.rol + ')');
    $('#verRegistradoPor').text(danado.registrado_por.nombre);
}

function obtenerBadgeEstado(estado) {
    const badges = {
        'Pendiente': '<span class="badge-estado-danado badge-estado-pendiente">Pendiente</span>',
        'Parcial': '<span class="badge-estado-danado badge-estado-parcial">Parcial</span>',
        'Cerrado': '<span class="badge-estado-danado badge-estado-cerrado">Cerrado</span>'
    };
    return badges[estado] || '<span class="badge-estado-danado">' + estado + '</span>';
}

function mostrarCargandoDanado() {
    // Limpiar y mostrar loading en campos principales
    $('#verNombreProducto').html('<i class="fas fa-spinner fa-spin"></i> Cargando...');
    $('#verCategoriaProducto').text('...');
    $('#verStockProducto').text('...');
    $('#verCodigoDisplay').html('<span class="codigo-danado-badge">...</span>');
}

function limpiarModalVerDanado() {
    // Limpiar todos los campos
    $('#verNombreProducto').text('-');
    $('#verCategoriaProducto').text('-');
    $('#verStockProducto').text('0');
    $('#verCodigoDisplay').html('');
    $('#verCantidadDanada').text('0');
    $('#verCantidadRecuperada').text('0');
    $('#verCantidadRepuesta').text('0');
    $('#verCantidadPendiente').text('0');
    $('#verEstadoDanado').html('');
    $('#verFechaRegistro').text('-');
    $('#verComentario').text('-');
    $('#verUbicacion').text('-');
    $('#verRegistradoPor').text('-');
    
    // Limpiar imágenes
    $('#verFotoProducto').attr('src', '');
    $('#verFotoDano').attr('src', '');
    $('#verFotoProductoContainer').hide();
    $('#verFotoProductoPlaceholder').hide();
    $('#verFotoDanoContainer').hide();
    $('#verFotoDanoPlaceholder').hide();
}
