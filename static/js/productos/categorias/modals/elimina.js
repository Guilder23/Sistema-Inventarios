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
            if (categoriaIdEliminar) {
                const form = $(this);
                form.attr('action', `/productos/categorias/${categoriaIdEliminar}/eliminar/`);
            }
        });
    });
})();
