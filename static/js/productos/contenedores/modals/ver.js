(function() {
    'use strict';

    $(document).ready(function() {
        console.log('Ver.js: document.ready ejecutado');

        $(document).on('click', '.btn-ver-contenedor', function(e) {
            console.log('Ver.js: Click en btn-ver-contenedor');
            e.preventDefault();
            const contenedorId = $(this).data('contenedor-id');
            console.log('Ver.js: contenedorId =', contenedorId);
            cargarYMostrarContenedor(contenedorId);
        });
    });

    function cargarYMostrarContenedor(contenedorId) {
        console.log('Ver.js: Llamando AJAX para cargar contenedor', contenedorId);
        $.ajax({
            url: `/productos/contenedores/${contenedorId}/obtener/`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                console.log('Ver.js: Datos recibidos:', data);
                $('#verNombre').text(data.nombre || 'No especificado');
                $('#verProveedor').text(data.proveedor || 'No especificado');
                $('#verStock').text((data.stock ?? 0) + ' unidades');

                const estadoBadge = data.activo
                    ? '<span class="badge-estado badge-estado-activo"><i class="fas fa-check-circle"></i> Activo</span>'
                    : '<span class="badge-estado badge-estado-inactivo"><i class="fas fa-times-circle"></i> Inactivo</span>';

                $('#verEstado').html(estadoBadge);
                $('#verCreadoPor').text(data.creado_por || 'No disponible');
                $('#verFechaCreacion').text(data.fecha_creacion || 'No disponible');
                $('#verFechaActualizacion').text(data.fecha_actualizacion || 'No disponible');

                console.log('Ver.js: Abriendo modal...');
                $('#modalVerContenedor').modal('show');
            },
            error: function(xhr, status, error) {
                console.error('Ver.js: Error al cargar contenedor:', { status, error, response: xhr.responseText });
                alert('Error al cargar los datos del contenedor');
            }
        });
    }
})();
