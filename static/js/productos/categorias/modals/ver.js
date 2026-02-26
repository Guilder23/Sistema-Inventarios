(function() {
    'use strict';

    $(document).ready(function() {
        $(document).on('click', '.btn-ver-categoria', function(e) {
            e.preventDefault();
            const categoriaId = $(this).data('categoria-id');
            cargarYMostrarCategoria(categoriaId);
        });
    });

    function cargarYMostrarCategoria(categoriaId) {
        $.ajax({
            url: `/productos/categorias/${categoriaId}/obtener/`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                $('#verNombre').text(data.nombre || 'No especificado');
                $('#verDescripcion').text(data.descripcion || 'Sin descripción');

                const estadoBadge = data.activo
                    ? '<span class="badge-estado badge-estado-activo"><i class="fas fa-check-circle"></i> Activo</span>'
                    : '<span class="badge-estado badge-estado-inactivo"><i class="fas fa-times-circle"></i> Inactivo</span>';

                $('#verEstado').html(estadoBadge);
                $('#verCreadoPor').text(data.creado_por || 'No disponible');
                $('#verFechaCreacion').text(data.fecha_creacion || 'No disponible');
                $('#verFechaActualizacion').text(data.fecha_actualizacion || 'No disponible');

                $('#modalVerCategoria').modal('show');
            },
            error: function() {
                alert('Error al cargar los datos de la categoría');
            }
        });
    }
})();
