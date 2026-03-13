// ================================================================
// MODAL VER USUARIO - VERSIÓN SIMPLIFICADA
// ================================================================

(function() {
    'use strict';
    
    // Esperar a que jQuery esté listo
    $(document).ready(function() {
        
        // Delegación de eventos para botones de ver (dinámicos)
        $(document).on('click', '.btn-ver-usuario', function(e) {
            e.preventDefault();
            const userId = $(this).data('usuario-id');
            cargarYMostrarUsuario(userId);
        });
    });
    
    function cargarYMostrarUsuario(userId) {
        
        $.ajax({
            url: `/usuarios/${userId}/obtener/`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                
                // Mostrar datos en el modal
                $('#verUsername').text(data.username);
                $('#verEmail').text(data.email);
                $('#verNombrecompleto').text(data.nombre_completo || 'No especificado');
                $('#verTipo').text(data.rol_display);
                
                // Mostrar estado con badge personalizado
                const estadoBadge = data.is_active 
                    ? '<span class="badge-estado badge-estado-activo"><i class="fas fa-check-circle"></i> Activo</span>' 
                    : '<span class="badge-estado badge-estado-inactivo"><i class="fas fa-times-circle"></i> Inactivo</span>';
                $('#verEstado').html(estadoBadge);
                
                // Mostrar almacén o tienda según corresponda
                const ubicacionDiv = $('#verUbicacion');
                const ubicacionGrupo = $('#verUbicacionGrupo');
                if (data.almacen_nombre) {
                    ubicacionDiv.html(
                        '<i class="fas fa-warehouse"></i> Almacén: <strong>' + 
                        data.almacen_nombre + '</strong>'
                    );
                    ubicacionGrupo.show();
                } else if (data.tienda_nombre) {
                    ubicacionDiv.html(
                        '<i class="fas fa-store"></i> Tienda: <strong>' + 
                        data.tienda_nombre + '</strong>'
                    );
                    ubicacionGrupo.show();
                } else {
                    ubicacionGrupo.hide();
                }
                
                // Mostrar creador
                if (data.creado_por) {
                    $('#verCreadoPor').text(data.creado_por);
                } else {
                    $('#verCreadoPor').text('No disponible');
                }
                
                // Fechas
                $('#verFecha').text(data.date_joined || 'No disponible');
                $('#verUltimoAcceso').text(data.last_login || 'Nunca');
                
                // Abrir el modal
                $('#modalVerUsuario').modal('show');
            },
            error: function(xhr, status, error) {
                alert('Error al cargar los datos del usuario');
            }
        });
    }
    
})();
