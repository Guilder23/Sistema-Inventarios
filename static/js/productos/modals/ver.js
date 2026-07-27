// ================================================================
// MODAL VER PRODUCTO
// ================================================================

(function() {
    'use strict';
    
    window.inicializarModalVer = function() {
        // Manejar clic en botón ver
        $(document).on('click', '.btn-ver-producto', function() {
            const productoId = $(this).data('producto-id');
            const ubicacionId = $(this).data('ubicacion-id');
            cargarProducto(productoId, ubicacionId);
        });
        
        console.log('✓ Modal Ver Producto inicializado');
    };
    
    function cargarProducto(productoId, ubicacionId) {
        const url = ubicacionId
            ? `/productos/${productoId}/obtener/?ubicacion_id=${encodeURIComponent(ubicacionId)}`
            : `/productos/${productoId}/obtener/`;
        
        $.ajax({
            url: url,
            type: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function(data) {
                console.log('Producto obtenido:', data);
                mostrarProducto(data);
            },
            error: function(xhr) {
                alert('Error al cargar los datos del producto');
                console.error(xhr);
            }
        });
    }
    
    function mostrarProducto(data) {
        // Código en badge
        $('#verCodigoDisplay').html(`<span class="codigo-producto-badge">${data.codigo || ''}</span>`);

        // Información General
        $('#verNombre').text(data.nombre || 'Sin nombre');
        $('#verCategoria').text(data.categoria_nombre || data.categoria || 'Sin categoría');

        // Manejo flexible del campo "contenedor" (puede venir como string, objeto, o lista)
        let contenedorText = 'Sin contenedor';
        if (data.contenedor_nombre) contenedorText = data.contenedor_nombre;
        else if (data.contenedor && typeof data.contenedor === 'string') contenedorText = data.contenedor;
        else if (data.contenedor && (data.contenedor.nombre || data.contenedor.nombre_corto)) contenedorText = data.contenedor.nombre || data.contenedor.nombre_corto;
        else if (Array.isArray(data.contenedores) && data.contenedores.length) {
            contenedorText = data.contenedores.map(c => c.nombre || c.contenedor_nombre || c).join(', ');
        } else if (Array.isArray(data.ubicaciones) && data.ubicaciones.length) {
            contenedorText = data.ubicaciones.map(u => u.nombre || u.ubicacion_nombre || u).join(', ');
        } else if (data.ubicacion_nombre) contenedorText = data.ubicacion_nombre;

        $('#verContenedor').text(contenedorText);
        $('#verDescripcion').text(data.descripcion || 'Sin descripción');

        // Control de Stock
        const stock = data.stock != null ? data.stock : 0;
        $('#verStock').text(stock + ' unidades');
        $('#verStockporCaja').text((data.stock_cajas != null ? data.stock_cajas : 0) + ' cajas');
        $('#verUnidadesPorCaja').text(data.unidades_por_caja != null ? data.unidades_por_caja : '-');

        $('#verStockCritico').text(data.stock_critico != null ? data.stock_critico : '-');
        $('#verStockBajo').text(data.stock_bajo != null ? data.stock_bajo : '-');

        // Precios Bs
        $('#verPrecioUnidad').text('Bs. ' + parseFloat(data.precio_unidad || 0).toFixed(2));
        $('#verPrecioCompra').text('Bs. ' + parseFloat(data.precio_compra || 0).toFixed(2));
        $('#verPrecioCaja').text('Bs. ' + parseFloat(data.precio_caja || 0).toFixed(2));
        $('#verPrecioMayor').text('Bs. ' + parseFloat(data.precio_mayor || 0).toFixed(2));
        $('#verPoliza').text('Bs. ' + parseFloat(data.poliza || 0).toFixed(2)); 
        $('#verGastos').text('Bs. ' + parseFloat(data.gastos || 0).toFixed(2));

    // Función para formatear precios en bolvianos
    function formatearPrecio(valor) {
        let numero = parseFloat(valor);
        return isNaN(numero) ? "Bs. 0.00" : "Bs. " + numero.toFixed(2);
    }

    // Precios en dólares
    $('#verPrecioUnidadDolar').text(formatearPrecio(data.precio_unidad_dolar));
    $('#verPrecioCompraDolar').text(formatearPrecio(data.precio_compra_dolar));
    $('#verPrecioMayorDolar').text(formatearPrecio(data.precio_mayor_dolar));
    $('#verPrecioCajaDolar').text(formatearPrecio(data.precio_caja_dolar));
        
        // Auditoría
        $('#verCreadoPor').text(data.creado_por || 'No disponible');
        $('#verFechaCreacion').text(data.fecha_creacion || 'No disponible');
        $('#verFechaActualizacion').text(data.fecha_actualizacion || 'No disponible');
        
        // Imagen y estado
        mostrarImagen(data);
        mostrarEstado(data);
        // Cargar contenedores asociados (si el backend los expone en endpoint separado)
        cargarContenedores(data.id);
        
        // Abrir modal
        $('#modalVerProducto').modal('show');
    }

    function cargarContenedores(productoId) {
        const url = `/productos/${productoId}/contenedores/json/`;
        $.ajax({
            url: url,
            type: 'GET',
            headers: {'X-Requested-With': 'XMLHttpRequest'},
            success: function(resp) {
                try {
                    if (resp.contenedores && resp.contenedores.length) {
                        const nombres = resp.contenedores.map(c => c.contenedor__nombre || c.nombre || c["contenedor__nombre"] || '').filter(Boolean);
                        if (nombres.length) {
                            $('#verContenedor').text(nombres.join(', '));
                            return;
                        }
                    }
                } catch (e) {
                    console.error('Error procesando contenedores:', e);
                }
                // fallback si no hay contenedores
                if (!$('#verContenedor').text()) $('#verContenedor').text('Sin contenedor');
            },
            error: function(xhr) {
                // si no autorizado o error, dejamos el texto ya calculado o 'Sin contenedor'
                if (!$('#verContenedor').text()) $('#verContenedor').text('Sin contenedor');
            }
        });
    }
    
    function mostrarImagen(data) {
        let html = '';
        
        if (data.foto) {
            html += `<img src="${data.foto}" alt="${data.nombre}" class="img-fluid rounded" style="max-width: 100%; max-height: 300px; object-fit: cover; border: 2px solid #e5e7eb;">`;
        } else {
            html += '<div class="bg-light rounded d-flex align-items-center justify-content-center" style="height: 300px; border: 2px dashed #d1d5db;"><div class="text-center"><i class="fas fa-image fa-3x text-muted mb-2"></i><p class="text-muted">Sin imagen</p></div></div>';
        }
        
        $('#previewProductoFoto').html(html);
    }
    
    function mostrarEstado(data) {
        let html = '';
        
        if (data.activo) {
            html += '<span class="estado-producto-activo"><i class="fas fa-check-circle"></i> ACTIVO</span>';
        } else {
            html += '<span class="estado-producto-inactivo"><i class="fas fa-times-circle"></i> INACTIVO</span>';
        }
        
        $('#verEstadoBtn').html(html);
    }
})();
