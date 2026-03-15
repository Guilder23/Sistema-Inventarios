(function() {
    'use strict';

    $(document).ready(function() {
        console.log('Edita.js: document.ready ejecutado');

        $(document).on('click', '.btn-editar-contenedor', function(e) {
            console.log('Edita.js: Click en btn-editar-contenedor');
            e.preventDefault();
            const contenedorId = $(this).data('contenedor-id');
            console.log('Edita.js: contenedorId =', contenedorId);
            cargarDatosContenedor(contenedorId);
        });

        $('#formEditarContenedor').on('submit', function(e) {
            console.log('Edita.js: Form submit detectado');
            e.preventDefault();

            if (!validarFormularioEditar()) {
                console.log('Edita.js: Validación falló');
                return false;
            }

            const contenedorId = $('#editarContenedorId').val();
            const formData = $(this).serialize();

            console.log('Edita.js: Enviando AJAX para editar:', { contenedorId, formData });

            $.ajax({
                url: `/productos/contenedores/${contenedorId}/editar/`,
                type: 'POST',
                data: formData,
                success: function(response) {
                    console.log('Edita.js: Respuesta exitosa:', response);
                    $('#modalEditarContenedor').modal('hide');
                    location.reload();
                },
                error: function(xhr, status, error) {
                    console.error('Edita.js: Error al actualizar:', { status, error, response: xhr.responseText });
                    alert('Error al actualizar el contenedor');
                }
            });
        });

        $('#modalEditarContenedor').on('hidden.bs.modal', function() {
            console.log('Edita.js: Modal cerrada');
            const form = $('#formEditarContenedor')[0];
            if (form) {
                form.reset();
            }
        });
    });

    function cargarDatosContenedor(contenedorId) {
        console.log('Edita.js: Llamando AJAX para cargar datos:', contenedorId);
        $.ajax({
            url: `/productos/contenedores/${contenedorId}/obtener/`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                console.log('Edita.js: Datos recibidos:', data);
                $('#editarContenedorId').val(data.id);
                $('#editNombre').val(data.nombre || '');
                $('#editDescripcion').val(data.descripcion || '');
                $('#editProveedor').val(data.proveedor || '');
                $('#editActivo').prop('checked', data.activo);
                console.log('Edita.js: Abriendo modal...');
                $('#modalEditarContenedor').modal('show');
            },
            error: function(xhr, status, error) {
                console.error('Edita.js: Error al cargar datos:', { status, error, response: xhr.responseText });
                alert('Error al cargar los datos del contenedor');
            }
        });
    }

    function validarFormularioEditar() {
        const nombre = $('#editNombre').val().trim();
        const proveedor = $('#editProveedor').val().trim();

        console.log('Edita.js: Validando:', { nombre, proveedor });

        if (!nombre || !proveedor) {
            alert('Nombre y proveedor son requeridos');
            return false;
        }

        return true;
    }
})();
