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
            $('#eliminarContenedorNombre').text(contenedorNombre);
            $('#modalEliminarContenedor').modal('show');
        });

        $('#formEliminarContenedor').on('submit', function(e) {
            console.log('Elimina.js: Form submit detectado');
            e.preventDefault();
            if (contenedorIdEliminar) {
                eliminarContenedor(contenedorIdEliminar);
            }
        });
    });

    function eliminarContenedor(contenedorId) {
        const csrftoken = $('[name=csrfmiddlewaretoken]').val();

        console.log('Elimina.js: Enviando AJAX para eliminar:', { contenedorId, csrftoken });

        $.ajax({
            url: `/productos/contenedores/${contenedorId}/eliminar/`,
            type: 'POST',
            headers: {
                'X-CSRFToken': csrftoken
            },
            success: function(response) {
                console.log('Elimina.js: Respuesta exitosa:', response);
                $('#modalEliminarContenedor').modal('hide');
                location.reload();
            },
            error: function(xhr, status, error) {
                console.error('Elimina.js: Error al eliminar:', { status, error, response: xhr.responseText });
                alert('Error al cambiar el estado del contenedor');
            }
        });
    }
})();
