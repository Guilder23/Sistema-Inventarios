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

            if (!validarFormularioEditar()) {
                console.log('Edita.js: Validación falló');
                e.preventDefault();
                return false;
            }

            // Dejar que el formulario se envíe normalmente para que los mensajes funcionen
            console.log('Edita.js: Enviando formulario...');
            // No prevenir el envío, dejar que se envíe normalmente
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
        
        // Configurar el action del formulario
        $('#formEditarContenedor').attr('action', `/productos/contenedores/${contenedorId}/editar/`);
        
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
