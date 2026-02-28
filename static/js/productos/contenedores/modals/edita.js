(function() {
    'use strict';

    $(document).ready(function() {
        $(document).on('click', '.btn-editar-contenedor', function(e) {
            e.preventDefault();
            const contenedorId = $(this).data('contenedor-id');
            cargarDatosContenedor(contenedorId);
        });

        $('#formEditarContenedor').on('submit', function(e) {
            e.preventDefault();

            if (!validarFormularioEditar()) {
                return false;
            }

            const contenedorId = $('#editarContenedorId').val();
            const formData = $(this).serialize();

            $.ajax({
                url: `/productos/contenedores/${contenedorId}/editar/`,
                type: 'POST',
                data: formData,
                success: function() {
                    $('#modalEditarContenedor').modal('hide');
                    location.reload();
                },
                error: function() {
                    alert('Error al actualizar el contenedor');
                }
            });
        });

        $('#modalEditarContenedor').on('hidden.bs.modal', function() {
            const form = $('#formEditarContenedor')[0];
            if (form) {
                form.reset();
            }
        });
    });

    function cargarDatosContenedor(contenedorId) {
        $.ajax({
            url: `/productos/contenedores/${contenedorId}/obtener/`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                $('#editarContenedorId').val(data.id);
                $('#editNombre').val(data.nombre || '');
                $('#editProveedor').val(data.proveedor || '');
                $('#editStock').val(data.stock ?? 0);
                $('#editActivo').prop('checked', data.activo);
                $('#modalEditarContenedor').modal('show');
            },
            error: function() {
                alert('Error al cargar los datos del contenedor');
            }
        });
    }

    function validarFormularioEditar() {
        const nombre = $('#editNombre').val().trim();
        const proveedor = $('#editProveedor').val().trim();
        const stock = $('#editStock').val();

        if (!nombre || !proveedor) {
            alert('Nombre y proveedor son requeridos');
            return false;
        }

        if (!stock || parseInt(stock) < 0) {
            alert('El stock debe ser un número válido');
            return false;
        }

        return true;
    }
})();
