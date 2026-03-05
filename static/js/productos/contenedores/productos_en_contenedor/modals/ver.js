(function() {
    'use strict';

    $(document).ready(function() {
        console.log('Ver.js: document.ready ejecutado');

        $(document).on('click', '.btn-ver-producto-contenedor', function(e) {
            console.log('Ver.js: Click en btn-ver-producto-contenedor');
            e.preventDefault();
            const pcId = $(this).data('pc-id');
            const nombre = $(this).data('nombre');
            const codigo = $(this).data('codigo');
            const cantidad = $(this).data('cantidad');
            
            cargarYMostrarProducto(pcId, nombre, codigo, cantidad);
        });
    });

    function cargarYMostrarProducto(pcId, nombre, codigo, cantidad) {
        console.log('Ver.js: Mostrando datos del producto:', { pcId, nombre, codigo, cantidad });
        
        $('#verPCId').text(pcId);
        $('#verNombre').text(nombre || 'No especificado');
        $('#verCodigo').text(codigo || 'No especificado');
        $('#verCantidad').html(`<span class="badge-modal">${cantidad} unidades</span>`);

        console.log('Ver.js: Abriendo modal...');
        $('#modalVerProductoContenedor').modal('show');
    }
})();
