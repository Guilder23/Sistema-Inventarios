(function() {
    'use strict';

    $(document).ready(function() {
        $(document).on('click', '.btn-ver-contenedor', function(e) {
            e.preventDefault();
            const contenedorId = $(this).data('contenedor-id');
            cargarYMostrarContenedor(contenedorId);
        });
    });

    function cargarYMostrarContenedor(contenedorId) {
        $.ajax({
            url: `/productos/contenedores/${contenedorId}/obtener/`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
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

                $('#modalVerContenedor').modal('show');
            },
            error: function() {
                alert('Error al cargar los datos del contenedor');
            }
        });
    }
})();
