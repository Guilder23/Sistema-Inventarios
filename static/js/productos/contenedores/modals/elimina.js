(function() {
    'use strict';

    let contenedorIdEliminar = null;

    $(document).ready(function() {
        console.log('Elimina.js: document.ready ejecutado');

        $(document).on('click', '.btn-eliminar-contenedor', function(e) {
            console.log('Elimina.js: Click en btn-eliminar-contenedor');
            e.preventDefault();
            const contenedorId = $(this).data('contenedor-id');
            const contenedorNombre = $(this).data('contenedor-nombre');

            console.log('Elimina.js: ', { contenedorId, contenedorNombre });

            contenedorIdEliminar = contenedorId;
            
            // Configurar el action del formulario
            $('#formEliminarContenedor').attr('action', `/productos/contenedores/${contenedorId}/eliminar/`);
            
            $('#eliminarContenedorNombre').text(contenedorNombre);
            $('#modalEliminarContenedor').modal('show');
        });

        $('#formEliminarContenedor').on('submit', function(e) {
            console.log('Elimina.js: Form submit detectado');
            // Dejar que el formulario se envíe normalmente para que los mensajes funcionen
            console.log('Elimina.js: Enviando formulario...');
            // No prevenir el envío, dejar que se envíe normalmente
        });
    });
})();
