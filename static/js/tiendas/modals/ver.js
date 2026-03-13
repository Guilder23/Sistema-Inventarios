// ==========================================
// MODAL VER TIENDA
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarModalVer();
});

function inicializarModalVer() {
    // Escuchar evento show.bs.modal del modal Ver
    jQuery('#modalVerTienda').on('show.bs.modal', function(e) {
        const button = jQuery(e.relatedTarget);
        const tiendaId = button.data('tienda-id');
        cargarDetallesTienda(tiendaId);
    });
}

function cargarDetallesTienda(tiendaId) {
    fetch(`/tiendas/${tiendaId}/obtener/`)
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar datos');
            return response.json();
        })
        .then(data => {
            // Información Básica
            document.getElementById('verNombre').textContent = data.nombre || '';
            document.getElementById('verDescripcion').textContent = data.descripcion || 'No especificado';
            document.getElementById('verTipo').textContent = data.tipo_display || '';
            document.getElementById('verAlmacen').textContent = data.almacen_nombre || '';
            
            // Ubicación
            document.getElementById('verDireccion').textContent = data.direccion || '';
            document.getElementById('verCiudad').textContent = data.ciudad || '';
            document.getElementById('verDepartamento').textContent = data.departamento || '';
            document.getElementById('verCoordenadas').textContent = data.coordenadas || 'No especificado';
            
            // Estado
            const estadoElement = document.getElementById('verEstado');
            estadoElement.textContent = data.estado_display || data.estado;
            estadoElement.className = 'mb-0 estado-tienda estado-' + data.estado;
            
            // Auditoría
            document.getElementById('verCreadoPor').textContent = data.creado_por || 'Sistema';
            document.getElementById('verFechaCreacion').textContent = data.fecha_creacion || '';
            document.getElementById('verFechaActualizacion').textContent = data.fecha_actualizacion || '';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cargar los detalles de la tienda');
        });
}
