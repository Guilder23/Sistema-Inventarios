// ==========================================
// MODAL ELIMINAR/CAMBIAR ESTADO TIENDA
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarModalEliminar();
});

function inicializarModalEliminar() {
    // Escuchar evento show.bs.modal del modal Eliminar
    jQuery('#modalEliminarTienda').on('show.bs.modal', function(e) {
        const button = jQuery(e.relatedTarget);
        const tiendaId = button.data('tienda-id');
        const tiendaNombre = button.data('tienda-nombre');
        cargarEliminacionTienda(tiendaId, tiendaNombre);
        document.getElementById('formEliminarTienda').action = `/tiendas/${tiendaId}/cambiar-estado/`;
    });
    
    // Validar y enviar formulario
    const formEliminarTienda = document.getElementById('formEliminarTienda');
    if (formEliminarTienda) {
        formEliminarTienda.addEventListener('submit', function(e) {
            // El formulario se envía normalmente
        });
    }
    
    // Limpiar formulario cuando se cierre el modal
    jQuery('#modalEliminarTienda').on('hidden.bs.modal', function() {
        const formEliminarTienda = document.getElementById('formEliminarTienda');
        if (formEliminarTienda) {
            formEliminarTienda.reset();
        }
    });
}

function cargarEliminacionTienda(tiendaId, tiendaNombre) {
    fetch(`/tiendas/${tiendaId}/obtener/`)
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar datos');
            return response.json();
        })
        .then(data => {
            // Actualizar elementos del modal
            const eliminarIdElement = document.getElementById('eliminarTiendaId');
            const eliminarNombreElement = document.getElementById('eliminarTiendaNombre');
            const eliminarEstadoElement = document.getElementById('eliminarTiendaEstado');
            
            if (eliminarIdElement) eliminarIdElement.value = data.id || tiendaId;
            if (eliminarNombreElement) eliminarNombreElement.textContent = tiendaNombre;
            
            // Determinar nuevo estado (toggle)
            const estadoActual = data.estado || 'activo';
            const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
            const textoEstado = estadoActual === 'activo' ? 'será desactivada' : 'será activada';
            
            // Actualizar campo oculto con nuevo estado
            if (eliminarEstadoElement) eliminarEstadoElement.value = nuevoEstado;
            
            // Actualizar texto descriptivo en el segundo párrafo
            const textoMutedElement = document.querySelector('#modalEliminarTienda .modal-body p.text-muted');
            if (textoMutedElement) {
                textoMutedElement.textContent = `La tienda ${textoEstado}.`;
            }
        })
        .catch(error => {
            // En caso de error, usar valores por defecto
            const eliminarNombreElement = document.getElementById('eliminarTiendaNombre');
            const eliminarIdElement = document.getElementById('eliminarTiendaId');
            
            if (eliminarNombreElement) eliminarNombreElement.textContent = tiendaNombre;
            if (eliminarIdElement) eliminarIdElement.value = tiendaId;
            
            // alert('Error al cargar los datos'); // Comentado para evitar alerta innecesaria
        });
}
