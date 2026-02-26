(function() {
    'use strict';

    let categoriaIdEliminar = null;

    $(document).ready(function() {
        $(document).on('click', '.btn-eliminar-categoria', function(e) {
            e.preventDefault();
            const categoriaId = $(this).data('categoria-id');
            const categoriaNombre = $(this).data('categoria-nombre');

            categoriaIdEliminar = categoriaId;
            $('#eliminarCategoriaNombre').text(categoriaNombre);
            $('#modalEliminarCategoria').modal('show');
        });

        $('#formEliminarCategoria').on('submit', function(e) {
            e.preventDefault();
            if (categoriaIdEliminar) {
                eliminarCategoria(categoriaIdEliminar);
            }
        });
    });

    function eliminarCategoria(categoriaId) {
        const csrftoken = $('[name=csrfmiddlewaretoken]').val();

        $.ajax({
            url: `/productos/categorias/${categoriaId}/eliminar/`,
            type: 'POST',
            headers: {
                'X-CSRFToken': csrftoken
            },
            success: function() {
                $('#modalEliminarCategoria').modal('hide');
                location.reload();
            },
            error: function() {
                alert('Error al cambiar el estado de la categoría');
            }
        });
    }
})();
