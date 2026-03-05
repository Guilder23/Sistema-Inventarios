// ================================================================
// MODAL VER PRODUCTO
// ================================================================
console.log("ver.js cargado");
console.log("jQuery existe:", typeof $);
(function() {
    'use strict';
    
    window.inicializarModalVer = function() {
    $(document).on('click', '.btn-ver-producto', function() {
        const productoId = $(this).data('producto-id');
        const unidad = $(this).data('unidad');  // ← agrega esto
        cargarProducto(productoId, unidad);      // ← pasa unidad
    });
    console.log('✓ Modal Ver Producto inicializado');
};
function cargarProducto(productoId, unidad) {
    if (!window.inventarioDatos) {
        console.error("inventarioDatos no existe");
        return;
    }

    // Busca por código Y unidad_operativa → registro único
    const producto = window.inventarioDatos.find(
        p => p.codigo == productoId && p.unidad_operativa == unidad
    );

    if (!producto) {
        console.error("Producto no encontrado:", productoId, unidad);
        return;
    }

    mostrarProducto(producto);
}
    
    function mostrarProducto(data) {

    // Código
$('#verCodigoDisplay').empty();
$('#verCodigoDisplay').append(`<span class="codigo-producto-badge">Código Producto: ${data.codigo}</span>`);
        
        // Información General
        $('#verNombre').text(data.nombre);
        $('#verDescripcion').text(data.descripcion || 'Sin descripción');
        
        // Stock
        $('#verStock').text(data.stock + ' unidades');
        $('#verUnidadesPorCaja').text(data.cajas); // 👈 tu JSON usa "cajas"
        $('#verStockCritico').text(data.stock_critico);
        $('#verStockBajo').text(data.stock_bajo);
        
        // Precios (AJUSTADOS A TU JSON)
        $('#verPrecioUnidad')
            .text('Bs. ' + parseFloat(data.precio_unitario).toFixed(2));

        $('#verPrecioCaja')
            .text('Bs. ' + parseFloat(data.precio_por_caja).toFixed(2));

        $('#verPrecioMayor')
            .text('Bs. ' + parseFloat(data.precio_por_mayor).toFixed(2));

        $('#verPoliza').text(data.poliza || 'No definida');

        $('#verGastos')
            .text('Bs. ' + parseFloat(data.gastos || 0).toFixed(2));
        
        // Auditoría
        $('#verCreadoPor').text(data.creado_por || 'No disponible');
        $('#verFechaCreacion').text(data.fecha_creacion || 'No disponible');
        $('#verFechaActualizacion')
            .text(data.ultima_actualizacion || 'No disponible');
        
        // Imagen
        mostrarImagen(data);

      
        // Abrir modal
        $('#modalVerProducto').modal('show');
    }
    
    function mostrarImagen(data) {
    let html = '';

    if (data.fotos && typeof data.fotos === 'string') {  // ← era data.fotos[0]
        html = `
            <img src="${data.fotos}" 
                 alt="${data.nombre}" 
                 class="img-fluid rounded"
                 style="max-width:100%; max-height:300px; object-fit:cover;">
        `;
    } else {
        html = `
            <div class="bg-light rounded d-flex align-items-center justify-content-center"
                 style="height:300px; border:2px dashed #d1d5db;">
                <div class="text-center">
                    <i class="fas fa-image fa-3x text-muted mb-2"></i>
                    <p class="text-muted">Sin imagen</p>
                </div>
            </div>
        `;
    }
    $('#previewProductoFoto').html(html);
}

})();
document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.inicializarModalVer === 'function') {
        window.inicializarModalVer();
    }
});
document.addEventListener("click", function(e) {
    const btn = e.target.closest(".btn-ver-producto");
    if (btn) {
        console.log("CLICK DETECTADO");
    }
});