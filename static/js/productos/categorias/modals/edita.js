(function() {
    'use strict';

    $(document).ready(function() {
        $(document).on('click', '.btn-editar-categoria', function(e) {
            e.preventDefault();
            const categoriaId = $(this).data('categoria-id');
            cargarDatosCategoria(categoriaId);
        });

        $('#formEditarCategoria').on('submit', function(e) {
            e.preventDefault();

            if (!validarFormularioEditar()) {
                return false;
            }

            const categoriaId = $('#editarCategoriaId').val();
            const formData = $(this).serialize();

            $.ajax({
                url: `/productos/categorias/${categoriaId}/editar/`,
                type: 'POST',
                data: formData,
                success: function() {
                    $('#modalEditarCategoria').modal('hide');
                    location.reload();
                },
                error: function() {
                    alert('Error al actualizar la categoría');
                }
            });
        });

        $('#modalEditarCategoria').on('hidden.bs.modal', function() {
            const form = $('#formEditarCategoria')[0];
            if (form) {
                form.reset();
            }
        });
    });

    function cargarDatosCategoria(categoriaId) {
        $.ajax({
            url: `/productos/categorias/${categoriaId}/obtener/`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                $('#editarCategoriaId').val(data.id);
                $('#editNombre').val(data.nombre || '');
                $('#editDescripcion').val(data.descripcion || '');
                $('#editActivo').prop('checked', data.activo);
                $('#modalEditarCategoria').modal('show');
            },
            error: function() {
                alert('Error al cargar los datos de la categoría');
            }
        });
    }

    function validarFormularioEditar() {
        const nombre = $('#editNombre').val().trim();

        if (!nombre) {
            alert('El nombre de la categoría es requerido');
            return false;
        }

        if (nombre.length < 2) {
            alert('El nombre debe tener al menos 2 caracteres');
            return false;
        }

        return true;
    }
})();
