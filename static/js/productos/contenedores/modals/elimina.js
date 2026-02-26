(function() {
    'use strict';

    let contenedorIdEliminar = null;

    $(document).ready(function() {
        $(document).on('click', '.btn-eliminar-contenedor', function(e) {
            e.preventDefault();
            const contenedorId = $(this).data('contenedor-id');
            const contenedorNombre = $(this).data('contenedor-nombre');

            contenedorIdEliminar = contenedorId;
            $('#eliminarContenedorNombre').text(contenedorNombre);
            $('#modalEliminarContenedor').modal('show');
        });

        $('#formEliminarContenedor').on('submit', function(e) {
            e.preventDefault();
            if (contenedorIdEliminar) {
                eliminarContenedor(contenedorIdEliminar);
            }
        });
    });

    function eliminarContenedor(contenedorId) {
        const csrftoken = $('[name=csrfmiddlewaretoken]').val();

        $.ajax({
            url: `/productos/contenedores/${contenedorId}/eliminar/`,
            type: 'POST',
            headers: {
                'X-CSRFToken': csrftoken
            },
            success: function() {
                $('#modalEliminarContenedor').modal('hide');
                location.reload();
            },
            error: function() {
                alert('Error al cambiar el estado del contenedor');
            }
        });
    }
})();
