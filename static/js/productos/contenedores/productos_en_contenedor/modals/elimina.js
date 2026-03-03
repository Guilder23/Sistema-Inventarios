(function() {
    'use strict';

    let pcIdEliminar = null;

    $(document).ready(function() {
        console.log('Elimina.js: document.ready ejecutado');

        $(document).on('click', '.btn-eliminar-producto-contenedor', function(e) {
            console.log('Elimina.js: Click en btn-eliminar-producto-contenedor');
            e.preventDefault();
            const pcId = $(this).data('pc-id');
            const nombre = $(this).data('nombre');

            console.log('Elimina.js: ', { pcId, nombre });

            pcIdEliminar = pcId;
            $('#eliminarProductoNombre').text(nombre);
            $('#modalEliminarProductoContenedor').modal('show');
        });

        $('#btnConfirmarEliminar').on('click', function() {
            console.log('Elimina.js: Confirmar eliminación de pcId:', pcIdEliminar);
            if (pcIdEliminar) {
                eliminarProductoContenedor(pcIdEliminar);
            }
        });
    });

    function eliminarProductoContenedor(pcId) {
        const csrftoken = $('[name=csrfmiddlewaretoken]').val();

        console.log('Elimina.js: Enviando AJAX para eliminar:', { pcId, csrftoken });

        $.ajax({
            url: `/productos/contenedores/productos/${pcId}/eliminar/`,
            type: 'POST',
            headers: {
                'X-CSRFToken': csrftoken
            },
            success: function(response) {
                console.log('Elimina.js: Respuesta exitosa:', response);
                $('#modalEliminarProductoContenedor').modal('hide');
                location.reload();
            },
            error: function(xhr, status, error) {
                console.error('Elimina.js: Error al eliminar:', { status, error, response: xhr.responseText });
                alert('Error al eliminar el producto del contenedor');
            }
        });
    }
})();
