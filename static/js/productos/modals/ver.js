// ================================================================
// MODAL VER PRODUCTO
// ================================================================

(function() {
    'use strict';
    
    window.inicializarModalVer = function() {
        // Manejar clic en botón ver
        $(document).on('click', '.btn-ver-producto', function() {
            const productoId = $(this).data('producto-id');
            cargarProducto(productoId);
        });
        
        console.log('✓ Modal Ver Producto inicializado');
    };
    
    function cargarProducto(productoId) {
        const url = `/productos/${productoId}/obtener/`;
        
        $.ajax({
            url: url,
            type: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function(data) {
                mostrarProducto(data);
            },
            error: function(xhr) {
                alert('Error al cargar los datos del producto');
                console.error(xhr);
            }
        });
    }
    
    function mostrarProducto(data) {
        // Asignar valores a los campos
        $('#verCodigo').text(data.codigo);
        $('#verNombre').text(data.nombre);
        $('#verDescripcion').text(data.descripcion || 'Sin descripción');
        
        // Stock
        $('#verStock').text(data.stock + ' unidades');
        $('#verUnidadesPorCaja').text(data.unidades_por_caja);
        $('#verStockCritico').text(data.stock_critico);
        $('#verStockBajo').text(data.stock_bajo);
        
        // Precios
        $('#verPrecioUnidad').text('Bs. ' + parseFloat(data.precio_unidad).toFixed(2));
        $('#verPrecioCompra').text('Bs. ' + parseFloat(data.precio_compra).toFixed(2));
        $('#verPrecioCaja').text('Bs. ' + parseFloat(data.precio_caja).toFixed(2));
        $('#verPrecioMayor').text('Bs. ' + parseFloat(data.precio_mayor).toFixed(2));
        
        // Imagen y estado
        mostrarImagen(data);
        mostrarEstado(data);
        
        // Abrir modal
        $('#modalVerProducto').modal('show');
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
            html += '<span class="badge badge-success pl-3 pr-3 py-2" style="font-size: 0.875rem;"><i class="fas fa-check-circle"></i> ACTIVO</span>';
        } else {
            html += '<span class="badge badge-danger pl-3 pr-3 py-2" style="font-size: 0.875rem;"><i class="fas fa-times-circle"></i> INACTIVO</span>';
        }
        
        $('#verEstadoBtn').html(html);
    }
})();
